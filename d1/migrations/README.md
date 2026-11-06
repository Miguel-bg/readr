# Migrações do D1

Regra honesta: `d1/schema.sql` usa `create table if not exists` em tudo, que
**não adiciona colunas nem índices em tabelas que já existem no banco remoto**.
Toda mudança de esquema numa tabela que já está em produção precisa de:

1. O `schema.sql atualizado` (para bancos novos, ex.: testes/dev frescos);
2. UMA migração aqui, numerada em ordem, com o `alter` / `create index`
   idempotente possível (SQLite não tem `add column if not exists`; se rodar
   duas vezes, o erro "duplicate column" indica que já foi aplicada).

Execução: `npx wrangler d1 execute readr --remote --file d1/migrations/000X-nome.sql`
