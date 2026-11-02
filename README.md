# Readr 📚

Um aplicativo social de leitura completo rodando 100% no **Cloudflare Workers** com D1 como único banco de dados.

## Funcionalidades
- **Motores de leitura**: Realista (page-flip), Kindle-style (slide), Rolagem contínua.
- **Importação inteligente**: Suporte a EPUB, PDF e DOCX com extração automática de metadados e capas.
- **Social**: Rankings, atividades de amigos e estantes virtuais.
- **Arquitetura**: Otimizada para alta performance e segurança.

## Stack Técnica
- **Next.js 15 + Cloudflare Workers/D1**
- **Autenticação**: JWT HS256 + PBKDF2 (310k iterações)
- **Engine**: Componentes modulares de renderização com Zustand store para preferências.

## Deploy
```bash
npx wrangler secret put JWT_SECRET
npm run deploy
```

---
*MIT License*