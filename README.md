# Readr 📚

**Leitor social de livros 100% em Cloudflare Workers, D1 como único banco.**

- **Desktop**: visual fiel ao [textstack](https://github.com/mrviduus/textstack)  
- **Mobile**: visual fiel ao [liseur](https://github.com/chmouel/liseur)

---

## ✨ Features

| Feature | Descrição |
|---------|-----------|
| **Importação** | EPUB, PDF, DOCX com metadados, capas e TOC automatizados |
| **Leitor adaptativo** | textstack (desktop) + liseur (mobile) com anchor-based navigation |
| **Marcadores & Grifos** | Salve posições exatas e destaque com cores (amarelo, verde, azul, rosa) |
| **Busca** | Pesquise palavras dentro do livro, navegue diretamente para o resultado |
| **Temas visual** | 6 temas: light, sepia, cream, gray, dark, black + ajuste de brilho 45–100% |
| **Tipografia** | 4 fontes (Literata, Georgia, Source Sans, OpenDyslexic), tamanho, alinhamento, espaçamento |
| **Social** | Crie livros, interaja com avaliações e perfil público |

---

## 🛠️ Tech Stack

| Tecnologia | Uso |
|------------|-----|
| **Next.js 15** | App Router, React 18, TypeScript strict |
| **Cloudflare Workers** | Runtime edge com `@opennextjs/cloudflare` |
| **D1 (SQLite)** | Banco único + chunks de conteúdo |
| **Tailwind CSS** | Estilização responsiva |
| **Zustand** | `readerStore` v2 (tema, fonte, tamanho, espaçamento, brilho) |
| **next-intl** | i18n em PT/EN/ES |
| **JWT HS256** | Auth via cookie `httpOnly` + PBKDF2 (310k iterações) |

---

## 📁 Estrutura

```
/
├── d1/                     # Schema D1
├── scripts/                 # Scripts utilitários
├── src/
│   ├── app/                 # Pages + API routes
│   ├── components/
│   │   ├── editor/          # Editor de livros criados
│   │   ├── home/            # Dashboard e Continue Reading Hero
│   │   ├── library/         # Estante
│   │   ├── reader/          # ReaderEngine, SelectionToolbar, ThemeSwitcher
│   │   ├── reader/v2/       # TextStackReader, LiseurReader, content, useBookData
│   │   ├── ui/              # AppThemeProvider, LanguageProvider, etc
│   ├── lib/                 # Parsers, data layer, ReaderSource
│   ├── messages/            # pt.json, en.json, es.json (i18n)
│   └── store/               # readerStore.ts (v2)
├── public/fonts/            # Literata, SourceSan3, OpenDyslexic
├── src/styles/              # readr.css, reader-v2.css
├── wrangler.jsonc           # Config Worker (D1, ASSETS, WORKER_SELF_REFERENCE)
└── package.json             # Dependências
```

---

## 🚀 Desenvolvimento

```bash
npm install
npx wrangler d1 execute readr --local --file=d1/schema.sql
npm run dev          # http://localhost:3000
```

`.env.local` (ou `.dev.vars`):
```env
JWT_SECRET=sua_chave_secreta
```

---

## 🏗️ Deploy

**Automático**: Push para `main` dispara Cloudflare Workers Builds (`opennextjs-cloudflare build` → `wrangler deploy`).

**Manual**:
```bash
npx opennextjs-cloudflare build
npx wrangler deploy
```

**Produção**: https://readr.miguxl.workers.dev  
**Versão atual**: `9c6eff4d` (auto-deploy ativo)

---

## 🔒 Arquitetura

- **Zero-Trust**: senha derivada PBKDF2 (310k iterações), nunca enviada em claro
- **Server auth**: todas as regras de acesso no backend D1/Worker
- **Conteúdo privado**: `book_get` só retorna `content` ao dono do livro

---

## 📄 License

MIT — livre para uso, estudo e modificação.

---

## 👤 Autor

Desenvolvido por **Miguel Braga**