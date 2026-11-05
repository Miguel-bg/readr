/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  logging: {
    level: 'silent',
  },
  // Item 14 (banca): cabeçalhos de segurança em TODAS as rotas. CSP global NÃO
  // anda aqui: app RSC do Next precisa de nonce por rota; onde importa de
  // verdade (files/[id]), o CSP específico já existe. Estes headers são os
  // que não quebram framework: anti-sniffing, referrer mínimo, anti-clickjack,
  // features restritas e TLS pins.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=15552000' },
        ],
      },
    ]
  },
}

export default nextConfig

// Integra bindings do Cloudflare no `next dev` (D1 local via miniflare).
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare'

initOpenNextCloudflareForDev()
