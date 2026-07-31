# Readr

Aplicativo social de leitura, importação e autoria construído sobre o repositório existente com Next.js 14 App Router, React 18, TypeScript strict, Tailwind CSS, Supabase, Zustand, `react-pageflip` e `next-intl`.

## Estado verificado em 30/07/2026

### Testes aprovados nesta rodada

- `npx tsc --noEmit`: aprovado.
- `npm run build`: aprovado com Next.js 14.2.35; 18 páginas geradas e as três APIs de autenticação reconhecidas.
- PM2: processo `readr` online na porta 3000.
- `GET /`: HTTP 200.
- Console no dashboard e em `/settings`: nenhuma mensagem capturada.
- Supabase público com a chave anônima: `profiles`, `books` e `created_books` acessíveis; o projeto remoto possui 2 perfis, 1 importado e 1 autoral publicado no momento do teste.
- Busca local pelos nomes demonstrativos solicitados: nenhuma ocorrência no código, assets ou SQL. O único `51%` encontrado é um percentual CSS legítimo.

### Bloqueios comprovados

`SUPABASE_SERVICE_ROLE_KEY` não existe em `.env.local`, no shell nem em uma autenticação Vercel local. Por segurança ela não foi inventada, solicitada ao navegador ou prefixada com `NEXT_PUBLIC_`.

Consequências verificadas:

- `POST /api/auth/signup`: HTTP 503 com instrução para configurar a service role.
- `POST /api/auth/login`: HTTP 503 pela configuração server-side incompleta.
- cadastro, login automático, logout, login por e-mail/apelido, exclusão e cenário multiusuário real **não foram declarados aprovados**.
- `supabase/schema.sql` não pôde ser aplicado ao projeto remoto nesta rodada.
- o catálogo remoto ainda contém um importado chamado `Harry Potter The Complete Collection`; não há referência local a ele, mas removê-lo com segurança exige uma sessão proprietária ou service role. Portanto a limpeza remota não está concluída.

A CLI/token da Vercel também não está configurada no sandbox. O build está pronto para Vercel, mas nenhum deploy de produção foi falsamente declarado.

## Implementação atual

### Autenticação

- Cadastro com exatamente nome, apelido, e-mail e senha.
- Sem regra local de complexidade de senha; vale a política configurada no Supabase.
- Apelido normalizado e único case-insensitive por índice e validação server-side.
- ID público aleatório de oito dígitos com consulta de colisão.
- Criação via `admin.auth.admin.createUser({email_confirm: true})`.
- Login automático após cadastro no cliente.
- Login por e-mail ou apelido, com resolução case-insensitive em `account_aliases`.
- Service role usada apenas nas rotas Node.js server-side.
- Exclusão em `/api/auth/delete-account`: valida a sessão, remove arquivos do usuário nos três buckets e chama `admin.deleteUser`; as tabelas ligadas a `profiles/auth.users` usam cascata.

### Leitor

- Conteúdo contínuo repaginado conforme viewport, fonte, margens e espaçamento.
- Posição persistida por `anchor_offset`, um offset global de palavras, além da página derivada.
- `ResizeObserver` único, agrupado com `requestAnimationFrame`.
- Páginas memoizadas e janela de oito páginas no `react-pageflip`.
- Rolagem usa janela virtual de nove páginas com espaçadores, evitando montar o livro inteiro.
- Capítulos, miniaturas textuais reais, busca destacada e marcadores listáveis/removíveis/navegáveis.
- Marcadores também persistem âncora; mudanças de paginação recalculam o destino.
- Brilho exposto somente em telas móveis.
- Transições honestas: curva real (`react-pageflip`), slide e fade; opções OpenGL/decorativas foram removidas.
- Preferências do leitor persistidas pelo middleware `persist` do Zustand.
- Navegação determinística via parâmetro interno validado `from`.

As colunas `reading_progress.anchor_offset` e `bookmarks.anchor_offset` estão no SQL local e precisam ser aplicadas remotamente antes de testar persistência real.

### Interface e configurações

- Tema global claro/escuro persistente por `data-theme`, com toggle no cabeçalho e controles em Configurações.
- Idioma PT/EN/ES sem reload e sem `MutationObserver`, usando `NextIntlClientProvider` e catálogos JSON.
- Leitor, navegação, autenticação e principais controles usam `useTranslations`; ainda há textos literais em telas extensas de biblioteca, detalhes e comunidade que devem ser migrados antes de afirmar cobertura integral.
- Perfil próprio mostra métricas, seguidores/seguindo e atalho para adicionar amigos.
- Contador de leitores é estável entre telas: zero mostra apenas olho discreto; valores positivos mostram olho preenchido e número; a regra global coral é `reads_count >= 10`, definida em `src/lib/popularity.ts`, sem “top 3” relativo.

## Rotas

| Rota | Função |
|---|---|
| `/` | Dashboard e continuar leitura |
| `/auth/signup` | Cadastro |
| `/auth/login` | Login por e-mail/apelido |
| `/library` | Estante pessoal |
| `/library/community?query=` | Catálogo público e filtros |
| `/library/created` | Livros autorais |
| `/community` | Pessoas e rankings |
| `/profile` | Perfil próprio e métricas |
| `/profile/[id]` | Perfil público |
| `/import` | Importação EPUB/PDF/DOCX |
| `/create` | Novo livro autoral |
| `/book/[id]/details?source=...&from=...` | Detalhes públicos e origem de navegação |
| `/book/[id]?source=...&from=...` | Leitor autenticado |
| `/book/[id]/manage` | Gerenciar importado próprio |
| `/book/[id]/edit` | Editar autoral próprio |
| `/settings` | Tema, idioma, padrões do leitor e exclusão |
| `/api/auth/signup` | Criação administrativa confirmada |
| `/api/auth/login` | Resolução do apelido e sessão |
| `/api/auth/delete-account` | Exclusão autenticada da conta |

## Dados e segurança

- **Auth:** Supabase Auth.
- **Postgres:** `profiles`, `account_aliases`, `books`, `created_books`, `chapters`, `reading_progress`, `book_reads`, `shelf_items`, `book_reactions`, `reviews`, `follows`, `activities`, `bookmarks`, `customization_settings`.
- **RLS:** leitura pública apenas onde prevista; escrita do proprietário; progresso e marcadores privados.
- **Grants:** visitantes não recebem `books.content`.
- **Storage:** `covers`/`avatars` públicos e `uploads` privado por usuário.
- **Segredos:** `.env.local`, `.vercel`, archives, caches, `.next` e `node_modules` são ignorados.

## Configuração

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

1. Configure as três variáveis, mantendo a service role somente no servidor.
2. Execute integralmente `supabase/schema.sql` no SQL Editor do projeto.
3. Reinicie o processo.
4. Execute os testes reais descritos abaixo antes de liberar produção.

## Testes de aceite ainda obrigatórios

Depois de configurar a service role e aplicar o schema:

1. cadastrar uma conta, confirmar login automático, logout e logins por e-mail/apelido;
2. validar duplicidade case-insensitive de e-mail/apelido;
3. criar A e B; A importa/publica, B lê;
4. confirmar leitura única, proprietário sem incremento, progresso/Continue Reading e bloqueios de UI/RLS;
5. testar mudanças de tipografia sem perder a âncora, capítulos, busca, miniaturas e bookmarks no banco;
6. testar os fluxos `Início → Continue → leitor → X → Início` e `Biblioteca → detalhes → leitor → X → detalhes → X → Biblioteca`;
7. remover o registro remoto demonstrativo identificado e repetir a busca final.

## Desenvolvimento e preview

```bash
npm install
npx tsc --noEmit
npm run build
pm2 start ecosystem.config.cjs
pm2 logs readr --nostream
```

Preview verificado nesta rodada:

- https://3000-i400wv8v5fyi7cqg0zhck-3844e1b6.sandbox.novita.ai

## Vercel

O destino final continua sendo Vercel. Configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` em Production/Preview/Development, execute o schema e inclua a URL implantada na configuração de URLs do Supabase Auth.

Este repositório Next.js não usa o deploy Cloudflare/Hono de um clique. Builds devem ser feitos em Linux/CI.

## Auditoria de dependências

`npm audit` encontrou 17 avisos: 16 altos na cadeia Next 14/ESLint e 1 moderado em `next-intl`. As correções automáticas propostas exigem mudanças maiores para Next 16, ESLint 10 e `next-intl` 4. O upgrade não foi aplicado porque o requisito desta entrega mantém Next.js 14/React 18 e uma atualização forçada alteraria a arquitetura sem testes de regressão. Próximo passo recomendado: planejar migração isolada para uma versão suportada, começando por Next 15, e repetir toda a matriz de aceite.

## Limitações

- PDF composto apenas por imagens requer OCR.
- EPUB com DRM não é suportado.
- Conteúdo dos livros nunca é traduzido pela interface.
- Não considerar autenticação, RLS multiusuário, exclusão ou deploy Vercel aprovados até a remoção dos bloqueios documentados.
