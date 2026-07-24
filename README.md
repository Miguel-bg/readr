# Readr

Aplicação de leitura e autoria construída com Next.js App Router, TypeScript, Tailwind CSS, Supabase e `react-pageflip`.

## Funcionalidades concluídas

- Cadastro e login temporários com Supabase Auth.
- Perfil com nome e avatar no Supabase Storage.
- Biblioteca sem dados demonstrativos: usuários novos começam com estante vazia.
- Importação persistente de EPUB, PDF e DOCX.
- Parsing real no navegador:
  - EPUB com JSZip e leitura do manifesto/spine;
  - PDF com PDF.js;
  - DOCX com Mammoth.
- Upload do arquivo original no bucket privado `uploads`.
- Upload opcional de capa no bucket público `covers`.
- Conteúdo extraído persistido em `books.content` para leitura posterior.
- Criação, edição, rascunho e publicação de livros autorais.
- Área **Descobrir** para livros publicados por outros usuários.
- RLS: somente o proprietário altera ou remove livros; usuários autenticados leem publicações.
- Contador real de leituras para leitores diferentes do proprietário.
- Progresso persistido por usuário, livro e origem.
- Continue Reading alimentado pelo progresso mais recente.
- Leitor responsivo com spread duplo no desktop e página única no mobile.
- Mouse, touch, teclado, setas e slider integrados ao PageFlip.
- Temas claro, sépia e escuro; fonte, tamanho, margens e espaçamento configuráveis.
- Capas procedurais determinísticas com oito composições editoriais.
- Sidebar desktop e bottom navigation mobile.
- Busca por título e autor.
- Loading, empty e error states sem fallback para mocks.

## Rotas

| Rota | Função |
|---|---|
| `/` | Dashboard e última leitura |
| `/auth/login` | Login temporário |
| `/auth/signup` | Cadastro temporário |
| `/library` | Arquivos importados do usuário |
| `/library/created` | Livros criados pelo usuário |
| `/library/community` | Descoberta de publicações de outros usuários |
| `/import` | Importação e parsing de EPUB/PDF/DOCX |
| `/create` | Novo livro autoral |
| `/book/[id]?source=imported` | Leitor de arquivo importado |
| `/book/[id]?source=created` | Leitor de livro autoral |
| `/book/[id]/edit` | Editor protegido por ownership/RLS |
| `/settings` | Preferências de leitura |
| `/profile` | Perfil, avatar e logout |

A biblioteca aceita `?query=texto` para busca.

## Configuração do Supabase

1. Crie um projeto no Supabase.
2. Abra **SQL Editor**.
3. Execute integralmente [`supabase/schema.sql`](supabase/schema.sql).
4. Confirme a criação das tabelas:
   - `profiles`;
   - `books`;
   - `created_books`;
   - `chapters`;
   - `reading_progress`;
   - `customization_settings`.
5. Confirme os buckets:
   - `covers` — público;
   - `avatars` — público;
   - `uploads` — privado.
6. Em desenvolvimento, copie `.env.example` para `.env.local` e preencha as chaves.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

A service-role key é exclusivamente server-side. O app atual não a envia ao navegador.

### Estado do ambiente Supabase recebido

Em 24/07/2026 foi feito um probe real usando a URL e anon key configuradas. O Auth respondeu, mas a API retornou `PGRST205` para `books`, `created_books` e `reading_progress`: as tabelas ainda não existem no projeto remoto informado. Por esse motivo, o teste multiusuário remoto não pôde ser concluído sem inventar um resultado. Execute `supabase/schema.sql` no projeto e então siga o roteiro abaixo.

## Teste multiusuário

1. Crie a conta A e publique um livro com capa e capítulos.
2. Saia e crie a conta B.
3. Em `/library/community`, abra a publicação da conta A.
4. Confirme o incremento de `created_books.reads_count`.
5. Avance páginas e confirme uma linha em `reading_progress` para a conta B.
6. Faça logout/login e confirme a retomada.
7. Acesse `/book/[id]/edit` com a conta B: a UI deve negar e a policy RLS deve bloquear qualquer update direto.
8. Na conta A, importe um EPUB/PDF/DOCX e confirme o objeto no bucket `uploads`, a linha em `books` e a retomada no Dashboard.

## Desenvolvimento

Requer Node.js 20 ou superior.

```bash
npm install
npm run dev
```

A aplicação usa `http://localhost:3000`.

Build e servidor de produção:

```bash
npm run build
npm run start
```

No sandbox, o PM2 usa `ecosystem.config.cjs`:

```bash
pm2 start ecosystem.config.cjs
pm2 logs readr --nostream
```

## Deploy na Vercel

1. Envie o repositório para GitHub/GitLab/Bitbucket.
2. Importe o repositório na Vercel como projeto Next.js.
3. Configure as variáveis do `.env.example` em **Project Settings → Environment Variables**.
4. Use `npm run build` como build command.
5. Não configure Cloudflare Pages ou Hono; o destino deste projeto é Vercel.
6. Aplique `supabase/schema.sql` antes de liberar cadastros.

## Modelo de dados

- `books`: importações privadas, metadados, path do arquivo e páginas extraídas.
- `created_books`: obras autorais e status de publicação.
- `chapters`: capítulos ordenados de obras autorais.
- `reading_progress`: progresso polimórfico com unique em `(user_id, book_id, book_source)`.
- `profiles`: identidade visual do usuário.
- `customization_settings`: estrutura preparada para preferências sincronizadas.

## Segurança

- Arquivos importados são privados e filtrados por `user_id`.
- Livros em rascunho são visíveis somente ao proprietário.
- Livros publicados são legíveis por usuários autenticados.
- Updates/deletes dependem de ownership no app e em RLS.
- A RPC de leituras ignora o proprietário e somente incrementa publicações.
- Segredos não devem ser commitados.

## Limitações e próximos passos

- A senha fixa `123456` é temporária e deve ser substituída por senha definida pelo usuário e verificação de e-mail.
- PDFs formados apenas por imagens precisam de OCR, ainda não incluído.
- EPUBs com DRM não são suportados.
- Preferências do Zustand ainda são locais; a tabela de sincronização já está preparada.
- O audit de produção ainda aponta advisories na linha Next.js 14/PostCSS; uma migração controlada para a versão major corrigida deve ser planejada, evitando `npm audit fix --force` sem testes.
