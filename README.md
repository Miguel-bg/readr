# Readr

Aplicação funcional de leitura, importação e autoria construída com Next.js 14 App Router, React, TypeScript, Tailwind CSS, Supabase, Zustand e `react-pageflip`.

## Funcionalidades concluídas

- Cadastro com nome, e-mail real e senha escolhida pelo usuário.
- Login com e-mail e senha, com sessão persistente do Supabase Auth em diferentes dispositivos.
- E-mail como identidade única da conta.
- Ausência de sessão tratada como estado normal, sem exibir `Auth session missing!`.
- Perfil com nome em `user_metadata`/`profiles` e avatar no Storage.
- Biblioteca sem usuários, livros ou progresso demonstrativos.
- Importação persistente de EPUB, PDF e DOCX.
- Parsing no navegador com JSZip, PDF.js e Mammoth.
- Livros importados legíveis por todos os usuários autenticados.
- Livros autorais publicados legíveis por todos os usuários autenticados.
- Somente o proprietário pode alterar ou excluir seus livros.
- Área **Descobrir** reunindo importados e publicações de outros usuários.
- Progresso persistido por usuário, livro e origem.
- Contador real de leituras para livros autorais publicados.
- Leitor responsivo: livro aberto no desktop e página única no mobile.
- Capas retangulares planas em proporção 2:3, imagem com `object-fit: cover`, bordas discretas e textos abaixo do card.
- Loading, error e empty states sem fallback para mocks.

## Rotas

| Rota | Função |
|---|---|
| `/` | Dashboard e última leitura |
| `/auth/login` | Login por nome, e-mail e senha |
| `/auth/signup` | Cadastro por nome, e-mail e senha |
| `/library` | Importações do usuário atual |
| `/library/created` | Livros criados pelo usuário atual |
| `/library/community` | Importados e livros publicados por outros usuários |
| `/import` | Importação de EPUB/PDF/DOCX |
| `/create` | Novo livro autoral |
| `/book/[id]?source=imported` | Leitor de livro importado |
| `/book/[id]?source=created` | Leitor de livro autoral |
| `/book/[id]/edit` | Editor protegido por proprietário e RLS |
| `/settings` | Preferências de leitura |
| `/profile` | Perfil, avatar e logout |

As bibliotecas aceitam `?query=texto` para busca.

## Configuração do Supabase

1. Crie um projeto no Supabase.
2. Abra **SQL Editor**.
3. Execute integralmente [`supabase/schema.sql`](supabase/schema.sql).
4. Se você já executou uma versão anterior, execute o arquivo novamente. Ele remove a policy privada antiga de `books` e cria as policies públicas de leitura autenticada, mantendo escrita apenas para o proprietário.
5. Confirme as tabelas `profiles`, `books`, `created_books`, `chapters`, `reading_progress` e `customization_settings`.
6. Confirme os buckets `covers`, `avatars` e `uploads`.
7. Em **Authentication → Providers → Email**, escolha uma destas opções:
   - para acesso imediato nesta fase simples, desative **Confirm email**;
   - se mantiver a confirmação ativa, o cadastro mostrará uma mensagem pedindo confirmação antes do primeiro login.

No ambiente Supabase verificado em 25/07/2026, o provedor de e-mail está habilitado e a confirmação de e-mail está **obrigatória**. Para entrar imediatamente após o cadastro, desative **Confirm email** no painel; essa configuração não pode ser ignorada pelo frontend.

8. Copie `.env.example` para `.env.local` e preencha:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

A service-role key não é usada no navegador e nunca deve ser exposta ou commitada.

### Por que aparecia `Auth session missing!`

A versão anterior chamava `auth.getUser()` e lançava `AuthSessionMissingError` quando o visitante ainda não possuía sessão. Agora o app consulta a sessão persistida e retorna perfil `null` quando não existe usuário autenticado. Isso é um estado normal, não um erro.

## RLS e modelo de acesso

- `books`: qualquer usuário autenticado pode ler; somente `user_id = auth.uid()` pode inserir, atualizar ou excluir.
- `created_books`: rascunhos são privados; publicações são legíveis por autenticados; somente o proprietário escreve.
- `chapters`: acompanham a visibilidade e a propriedade do livro autoral.
- `reading_progress`: cada usuário acessa somente seu próprio progresso.
- `profiles`: cada usuário lê e atualiza seu próprio perfil.
- `uploads`: os arquivos originais permanecem privados; a leitura compartilhada usa o conteúdo extraído persistido em `books.content`.

## Teste multiusuário recomendado

1. Com confirmação de e-mail desativada, crie a conta A usando nome, e-mail e senha.
2. Importe um EPUB/PDF/DOCX e publique um livro autoral.
3. Saia e crie a conta B com outro e-mail.
4. Em `/library/community`, confirme que a conta B vê e lê os dois livros da conta A.
5. Avance páginas e confirme a retomada após logout/login.
6. Tente abrir `/book/[id]/edit` com a conta B; a UI e a RLS devem impedir edição.
7. Entre novamente na conta A, inclusive em outro dispositivo, e confirme a edição normal.

## Desenvolvimento local

Requer Node.js 20+.

```bash
npm install
npm run dev
```

Build de produção:

```bash
npm run build
npm run start
```

No sandbox:

```bash
pm2 start ecosystem.config.cjs
pm2 logs readr --nostream
```

## Deploy na Vercel

1. Extraia o pacote do projeto e envie os arquivos para um repositório GitHub, GitLab ou Bitbucket.
2. Na Vercel, escolha **Add New → Project** e importe o repositório.
3. O framework deve ser detectado como **Next.js**.
4. Em **Settings → Environment Variables**, adicione `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` para Production, Preview e Development.
5. Não exponha `SUPABASE_SERVICE_ROLE_KEY` no frontend. O app atual não precisa dela para funcionar.
6. Use `npm run build` como Build Command e mantenha o Output Directory automático do Next.js.
7. Faça o deploy.
8. No Supabase, adicione a URL Vercel em **Authentication → URL Configuration → Site URL** e em **Redirect URLs**.
9. Execute a versão atual de `supabase/schema.sql` antes de liberar o site.

## Hospedagem Genspark

Este repositório usa Next.js com runtime de servidor. O Hosted Deploy padrão do Genspark é voltado ao stack Hono/Cloudflare Workers e não oferece publicação direta e confiável deste projeto Next.js sem uma migração específica para Cloudflare/OpenNext ou uma conversão para SPA/Hono. O build deve sempre ser feito em Linux. O código permanece pronto para Vercel; uma eventual migração de hospedagem não deve alterar o banco Supabase nem as regras RLS.

## Armazenamento e dados

- Supabase Auth: contas e sessões.
- Postgres: perfis, livros, capítulos e progresso.
- Storage `covers`: capas públicas.
- Storage `avatars`: avatares públicos.
- Storage `uploads`: originais privados.
- Zustand: preferências e estado imediato do leitor.

## Limitações e próximos passos

- PDFs formados somente por imagens precisam de OCR.
- EPUBs com DRM não são suportados.
- Preferências do Zustand ainda são locais; a tabela de sincronização já existe.
- A segurança usa Supabase Auth e RLS, mas ainda não inclui MFA, CAPTCHA ou políticas avançadas de senha.
