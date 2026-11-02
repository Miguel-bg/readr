# Readr

Um aplicativo social de leitura completo rodando 100% no **Cloudflare Workers** com D1 como único banco de dados.

---

## ✨ Features

- **Page-flip reader** – Leitor com efeito de virar página inspirado em livros físicos
- **Importação inteligente** – EPUB, PDF e DOCX com extração automática de metadados
- **Criar livros autorais** – Escreva e publique com capítulos personalizados
- **Destaque e bookmarks** – Salve marcas de página e destaque com notas
- **Social reading** – Siga outros leitores, veja rankings e atividades
- **Upload de arquivos** – Armazena arquivos em chunks no D1 (até 25 MB)

---

## 🛠️ Tech Stack

| Tecnologia | Uso |
|------------|-----|
| **Next.js 15** | App Router, React 18, TypeScript strict |
| **Cloudflare Workers** | Runtime edge com @opennextjs/cloudflare |
| **D1 (SQLite)** | Banco de dados relacional + armazenamento |
| **Tailwind CSS** | Estilização responsiva |
| **next-intl** | Internacionalização (PT/EN/ES) |
| **Zustand** | Gerenciamento de estado |
| **react-pageflip** | Componente page-flip |
| **pdfjs-dist** | Renderização de PDF |
| **mammoth** | Conversão DOCX para HTML |
| **jszip** | Extração de conteúdo EPUB |
| **JWT HS256** | Autenticação em httpOnly cookie |

---

## 📁 Project Structure

```
/
├── d1/                          # Schema do banco D1
│   └── schema.sql
├── scripts/                     # Scripts utilitários
│   ├── check-reader-translations.mjs
│   └── gen-test-epub.mjs
├── src/
│   ├── app/                     # App Router (páginas e APIs)
│   │   ├── api/
│   │   │   ├── auth/            # Endpoints de autenticação
│   │   │   ├── files/           # Upload e download de arquivos
│   │   │   └── rpc/             # Dispatcher de operações
│   │   ├── auth/                # Páginas login/signup
│   │   ├── book/                # Leitor e gerenciamento
│   │   ├── community/           # Perfil público
│   │   ├── create/              # Criação de livros
│   │   ├── import/              # Importação de arquivos
│   │   ├── library/             # Estante e catálogo
│   │   ├── profile/             # Gerenciamento de perfil
│   │   └── settings/            # Configurações
│   ├── components/              # Componentes React
│   ├── lib/                     # Lógica de negócio
│   ├── messages/                # Traduções (pt, en, es)
│   └── store/                   # Zustand store
├── public/                      # Assets
├── wrangler.jsonc               # Configuração do Worker
└── package.json                 # Scripts e dependências
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ e npm

### Installation

```bash
# Instalar dependências
npm install

# Inicializar banco D1 local (miniflare)
npx wrangler d1 execute readr --local --file=d1/schema.sql

# Iniciar em desenvolvimento
npm run dev        # http://localhost:3000
```

O servidor local usa o D1 em memória. Crie `.dev.vars` com:

```env
JWT_SECRET=sua_chave_aleatoria_aqui
```

---

## 🏗️ Deployment

```bash
# Build
npm run build

# Deploy
npm run deploy

# Configurar segredo JWT no Cloudflare (uma vez)
npx wrangler secret put JWT_SECRET
```

### Demo

**https://readr.miguxl.workers.dev**

---

## 🔒 Security Architecture

- **Autenticação**: JWT HS256 em httpOnly cookie
- **Derivação de senha**: PBKDF2 com 310k iterações no navegador
- **Armazenamento seguro**: `sha256(salt ‖ k)` - senha nunca armazenada em texto
- **Autorização**: Regras server-side baseadas em `user_id` da sessão
- **Arquivos privados**: 404 sem sessão válida

---

## 📖 Project Details

### Arquitetura de Dados

- **D1 (SQLite)**: Tabelas para perfis, livros, progresso, destaques, etc.
- **Arquivos em chunks**: 200 KB para texto, 512 KB para binários
- **Limite de backup**: 25 MB por arquivo de livro

### API

Operações através de `POST /api/rpc`:

```json
{ "op": "library_mine", "args": {} }
```

### Limitações Conhecidas

- 1 MB por linha no D1
- Backup de arquivo até 25 MB
- Nenhuma migração de dados da era Supabase (contas devem recriar)
- EPUB com DRM não suportado

---

## 📄 License

MIT License – Livre para uso e modificação.

---

## 👤 Author

Desenvolvido por **Miguel Braga** como projeto de portfólio.