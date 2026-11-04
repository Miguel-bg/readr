// Rate limit apoiado no D1 — o Readr usa só o D1 (sem KV/R2) por decisão de arquitetura,
// então o limitador vive numa tabela própria. Janela fixa de 15 minutos por chave.
// Uso principal: travar força-bruta em login/signup/kdf (item crítico da banca).
import { db } from './store'

const WINDOW_MS = 15 * 60 * 1000

/** IP do cliente pelo padrão do Cloudflare (com fallback para ambientes sem proxy). */
export function clientIp(request: Request): string {
  const header = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || ''
  return header.split(',')[0].trim() || 'desconhecido'
}

function currentWindow(): number {
  return Math.floor(Date.now() / WINDOW_MS)
}

/** Soma um hit na janela corrente da chave e devolve o total acumulado nela. */
export async function rateHit(bucketKey: string): Promise<number> {
  const window = currentWindow()
  const { results } = await db().prepare(`insert into rate_limits (key, window_start, hits) values (?, ?, 1)
    on conflict (key) do update set
      hits = case when rate_limits.window_start = excluded.window_start then rate_limits.hits + 1 else 1 end,
      window_start = excluded.window_start
    returning hits`)
    .bind(bucketKey, window).all<{ hits: number }>()
  const hits = results?.[0]?.hits ?? 1

  // Manutenção barata: em ~3% das chamadas, apaga janelas de mais de 8 horas atrás.
  if (Math.random() < 1 / 32) {
    await db().prepare('delete from rate_limits where window_start < ?').bind(window - 32).run()
  }
  return hits
}

/** Lê o total da janela corrente sem somar hit. */
export async function peekRateLimit(bucketKey: string): Promise<number> {
  const row = await db().prepare('select hits from rate_limits where key = ? and window_start = ?')
    .bind(bucketKey, currentWindow()).first<{ hits: number }>()
  return Number(row?.hits || 0)
}

/** true se ainda há capacidade nesta janela. */
export async function giveCapacity(bucketKey: string, maxHits: number): Promise<boolean> {
  return (await rateHit(bucketKey)) <= maxHits
}
