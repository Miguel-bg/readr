# Readr

Aplicativo social de leitura, importação e autoria construído com Next.js 14 App Router, React 18, TypeScript strict, Tailwind CSS, Supabase, Zustand, `react-pageflip` e Lucide.

## Funcionalidades concluídas

- Cadastro real com nome, apelido único, e-mail e senha.
- Cadastro server-side com usuário já confirmado (`email_confirm: true`) e login automático, sem tela intermediária de confirmação.
- Login por e-mail **ou apelido**; sessão persistente do Supabase Auth em qualquer dispositivo.
- Perfil público com apelido, ID aleatório de oito dígitos, bio e avatar.
- Tradução global de menus, botões, formulários, mensagens e conteúdo de interface para Português, English ou Español pelo seletor no perfil. A preferência fica salva no navegador.
- Biblioteca pública visível para visitantes, com detalhes e metadados; leitura exige conta.
- Home com até 12 livros mais lidos e botão **Ver mais**.
- Minha Estante com salvos, Quero ler, Lendo, Concluídos, importados e livros autorais.
- Busca, ordenação e filtros por gênero, autor, idioma, editora, tags, ano, lançamentos, origem, status, tamanho e avaliação.
- Cards 2:3 com contador de leitores, destaque coral nos mais lidos e configurações somente para o proprietário.
- Página de detalhes com descrição, avaliação, reviews, likes, dislikes, leitores, salvar e Ler agora.
- Leituras únicas por usuário; leitura do proprietário não incrementa o contador.
- Importação EPUB/PDF/DOCX com conteúdo persistente, metadados EPUB e capa automática do EPUB ou primeira página do PDF.
- Gerenciamento de importados: editar título, autor, descrição e capa ou excluir.
- Editor autoral com rascunho/publicação, capítulos reordenáveis, descrição, gênero, idioma, editora, ano e tags.
- Comunidade com busca por nome/apelido/ID, perfis aleatórios, seguir/deixar de seguir, seguidores, atividade e ranking.
- Leitor desktop em spread e mobile em página única, com progresso, temas, fonte, margem, espaçamento, brilho, pesquisa, capítulos, miniaturas, bookmarks, scroll, text reflow, qualidade, engine e estilos de animação.
- Nenhum usuário, livro, capa comercial ou dado demonstrativo.

## Rotas funcionais

| Rota | Função |
|---|---|
| `/` | Dashboard, continuar leitura e Mais Lidos |
| `/auth/signup` | Cadastro com nome, apelido, e-mail e senha |
| `/auth/login` | Login com e-mail ou apelido |
| `/library` | Minha Estante |
| `/library/community?query=` | Biblioteca pública e filtros |
| `/library/created` | Livros criados pelo usuário |
| `/community` | Pessoas e rankings |
| `/profile` | Perfil, idioma, avatar e logout |
| `/profile/[id]` | Perfil público, métricas e atividade |
| `/import` | Importação EPUB/PDF/DOCX |
| `/create` | Novo livro autoral |
| `/book/[id]/details?source=imported|created` | Detalhes públicos |
| `/book/[id]?source=imported|created` | Leitor autenticado |
| `/book/[id]/manage` | Gerenciar importado próprio |
| `/book/[id]/edit` | Editar livro autoral próprio |
| `/settings` | Preferências de leitura |
| `/api/auth/signup` | Cadastro confirmado no servidor |
| `/api/auth/login` | Resolução segura de e-mail/apelido e sessão |

## Arquitetura de dados

- **Supabase Auth:** usuários e sessões.
- **Postgres:** `profiles`, `account_aliases`, `books`, `created_books`, `chapters`, `reading_progress`, `book_reads`, `shelf_items`, `book_reactions`, `reviews`, `follows`, `activities`, `bookmarks` e `customization_settings`.
- **RLS:** metadados públicos, conteúdo somente para autenticados e escrita somente pelo proprietário.
- **Grants por coluna:** visitantes não recebem `books.content`.
- **Storage:** `covers` e `avatars` públicos; `uploads` privado por usuário.
- **Zustand:** estado imediato e opções avançadas do leitor.

## Configuração obrigatória do Supabase

1. Crie um projeto no Supabase.
2. Execute integralmente `supabase/schema.sql` no SQL Editor. O arquivo é idempotente e também faz backfill de IDs/aliases possíveis.
3. Copie `.env.example` para `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

4. Reinicie o servidor após alterar variáveis.

`SUPABASE_SERVICE_ROLE_KEY` é obrigatória para o cadastro sem confirmação e login por apelido. Ela deve existir **somente no servidor** e nunca pode ser prefixada com `NEXT_PUBLIC_`, exposta no navegador ou commitada. A chave não está configurada no sandbox atual; por isso o build funciona, mas o teste real de cadastro retorna 503 até ela ser adicionada.

## Uso

1. Crie uma conta; o login ocorre automaticamente.
2. Importe um EPUB/PDF/DOCX ou crie um livro com capítulos.
3. Publique para disponibilizar imediatamente na Biblioteca pública.
4. Abra os detalhes para salvar, reagir, avaliar ou iniciar a leitura.
5. Use Minha Estante para acompanhar status e progresso.
6. Em Comunidade, busque leitores e acompanhe rankings.
7. Em Perfil, selecione Português, English ou Español para traduzir toda a interface.

## Desenvolvimento

Requer Node.js 20+.

```bash
npm install
npm run build
npm run start
```

No sandbox:

```bash
pm2 delete readr 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 logs readr --nostream
```

## Deploy na Vercel

1. Envie o projeto para GitHub/GitLab/Bitbucket.
2. Na Vercel, use **Add New → Project** e importe o repositório.
3. Confirme o framework Next.js e Build Command `npm run build`.
4. Cadastre as três variáveis Supabase em Production, Preview e Development. Marque a service role como segredo.
5. Execute `supabase/schema.sql` antes de liberar o site.
6. Faça o deploy e adicione a URL Vercel em Supabase → Authentication → URL Configuration.

Este projeto usa runtime Node.js server-side. O fluxo Hono/Cloudflare Pages de um clique da plataforma não é compatível; Vercel é a hospedagem nativa recomendada. Uma migração para Cloudflare exigiria OpenNext e build Linux específico.

## Status e limitações

- **Build:** aprovado com Next.js 14.2.35.
- **Deploy de produção:** não executado; exige conta Vercel do proprietário.
- **Cadastro real no sandbox:** bloqueado apenas pela ausência de `SUPABASE_SERVICE_ROLE_KEY`.
- PDFs apenas com imagens exigem OCR.
- EPUBs com DRM não são suportados.
- A opção “OpenGL” aplica aceleração CSS/WebGL-friendly; navegadores não expõem troca literal do engine nativo de composição.
- Tradução cobre a interface do Readr; títulos, descrições e conteúdo dos livros permanecem no idioma original do autor.
