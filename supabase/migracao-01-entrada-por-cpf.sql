-- =====================================================================
--  Migração 01 — entrada do cliente por CPF
--
--  Rode isto no SQL Editor SE você já aplicou o schema.sql antes desta
--  mudança. Em banco novo não precisa: o schema.sql já vem com tudo.
--
--  O que muda: o cliente passa a poder entrar no portal pelo CPF, sem
--  depender do papel com o código. O CPF já tinha coluna (`documento`);
--  o que faltava era o índice para a busca e o contador de tentativas.
-- =====================================================================

-- Sem isto, cada consulta por CPF varre a tabela de clientes inteira.
create index if not exists idx_cliente_documento on cliente(documento);

-- CPF no Brasil não é segredo. Sem limite de tentativas, quem tiver um CPF
-- vazado precisa de 10 mil palpites para acertar os 4 dígitos do telefone —
-- minutos de script.
alter table cliente
  add column if not exists tentativas_portal int not null default 0;
