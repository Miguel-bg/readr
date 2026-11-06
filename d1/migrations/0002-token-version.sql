-- Item 10 (banca): revogação de JWT via token_version.
-- Aplicada no D1 remoto em 06/11/2026: faltou na primeira passada porque o
-- `create table if not exists` do schema.sql não altera tabelas pré-existentes;
-- a ausência derrubava TODA sessão (D1_ERROR: no such column: token_version).
alter table profiles add column token_version integer not null default 0;
