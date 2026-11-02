# Readr 📚

Um aplicativo social de leitura completo rodando 100% no **Cloudflare Workers** com D1 como único banco de dados.

---

## ✨ Features

- **Múltiplos Motores de Leitura**: 
  - **Realistic**: Efeito de virar página realista (`react-pageflip`).
  - **Kindle-style (Slide)**: Transição limpa e instantânea entre páginas.
  - **Rolagem Contínua (Scroll)**: Experiência de leitura fluida estilo *TextStack*.
- **Importação Inteligente**: EPUB, PDF e DOCX com extração automática de metadados, capas e sumários hierárquicos (TOC).
- **Customização Tipográfica**: Troca de fontes (Lora, Inter, Atkinson, etc.), controle de tamanho, entrelinhas e temas (Claro, Escuro, Sépia).
- **Social Reading**: Siga outros leitores, acompanhe o progresso e interaja com avaliações.

---

## 🛠️ Tech Stack

| Tecnologia | Uso |
|------------|-----|
| **Next.js 15** | App Router, React 18, TypeScript strict |
| **Cloudflare Workers** | Runtime edge com `@opennextjs/cloudflare` |
| **D1 (SQLite)** | Banco de dados relacional + armazenamento em chunks |
| **Tailwind CSS** | Estilização responsiva |
| **Zustand** | Gerenciamento de estado (Preferências do leitor) |
| **JWT HS256** | Autenticação segura via cookie `httpOnly` + PBKDF2 |

---

## 📁 Project Structure

```
/
├── d1/                          # Schema SQL do banco D1
│   └── schema.sql
├── scripts/                     # Scripts utilitários
│   └── check-reader-translations.mjs
├── src/
│   ├── app/                     # App Router (páginas e rotas de API)
│   │   ├── api/                 # Endpoints de Autenticação, RPC e Files
│   │   ├── auth/                # Login e Cadastro
│   │   ├── book/[id]/           # Motores e página de leitura
│   │   └── library/             # Estante e Catálogo
│   ├── components/
│   │   └── reader/
│   │       ├── engines/         # RealisticFlip, ScrollEngine, SlideEngine
│   │       └── ReaderPreferences.tsx # Painel de customização
│   ├── lib/                     # Parsers (EPUB/PDF/DOCX) e lógica D1
│   └── store/                   # Zustand store (ReaderPreferences)
├── public/                      # Assets estáticos
├── wrangler.jsonc               # Configuração do Cloudflare Worker
└── package.json                 # Dependências e scripts
```

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- Node.js 18+ e npm

### Instalação
```bash
# Instalar dependências
npm install

# Inicializar banco D1 local (Miniflare)
npx wrangler d1 execute readr --local --file=d1/schema.sql

# Iniciar servidor de desenvolvimento
npm run dev        # http://localhost:3000
```

Crie um arquivo `.dev.vars` na raiz com a chave JWT de teste:
```env
JWT_SECRET=sua_chave_secreta_local
```

---

## 🏗️ Publicação (Deploy)

O projeto está configurado para deploy automático via GitHub no Cloudflare Pages/Workers.

Para deploy manual:
```bash
npm run build
npx wrangler secret put JWT_SECRET
npm run deploy
```

### 🔗 Demo em Produção
**https://readr.miguxl.workers.dev**

---

## 🔒 Segurança e Arquitetura

- **Zero-Trust Client**: A senha nunca sai do navegador em claro (derivação via PBKDF2 com 310k iterações).
- **Server-Side Authorization**: Toda a lógica de acesso e regras de negócio residem no backend (D1 + Worker).
- **Isolamento de Arquivos**: Arquivos de livros são privados e protegidos contra acesso não autorizado (404 sem sessão válida).

---

## 📄 License

MIT License — Livre para uso, estudo e modificação.

---

## 👤 Author

Desenvolvido por **Miguel Braga** como projeto de portfólio.
