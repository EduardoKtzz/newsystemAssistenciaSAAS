# Mudar o projeto de região (us-west-2 → sa-east-1)

O Supabase **não troca a região de um projeto no lugar**. O caminho é criar um
projeto novo em São Paulo.

## Por que vale a pena

Medido desta máquina, uma requisição HTTPS completa:

| região | tempo |
|---|---|
| `us-west-1` (Norte da Califórnia) | 692ms |
| `us-west-2` (Oregon) — o atual | 667ms |
| `us-east-1` (Virgínia) | 467ms |
| `sa-east-1` (São Paulo) | **112ms** |

Só 52ms do tempo atual é o banco trabalhando; o resto é a viagem. Como o painel
faz 3 idas ao banco por navegação, a conta sai de ~2,1s para ~0,34s.

`us-west-1` e `us-west-2` são equivalentes daqui — trocar de uma para a outra
não resolveria nada.

## Enquanto o banco só tem dado de demonstração: recriar, não migrar

**Este é o caminho certo hoje.** Conferido em 21/08/2026: dos 14 clientes do
banco, 10 vêm do [seed-demo.sql](seed-demo.sql) e 4 foram digitados à mão em
testes (Natalia Deiro Ribeiro, Marina Rocha Ferreira, Joao Batista Souza,
Carla Menezes). Nenhum é cliente de verdade.

Recriar dispensa `pg_dump`, `psql`, senha de banco e connection string. São
dois copy-paste e um cadastro.

> **Quando isso deixa de valer:** no dia em que existir uma OS de cliente real,
> este caminho apaga o trabalho da loja. A partir daí é dump e restore — o
> roteiro está no fim deste arquivo.

### 1. Criar o projeto

supabase.com → **New project** → região **South America (São Paulo)**.

### 2. Rodar o esquema

SQL Editor → cole [`schema.sql`](schema.sql) inteiro → **Run**.

Ele já traz tudo: tabelas, gatilhos (número sequencial, código público,
garantia), RLS e os índices — inclusive o do CPF. O
[`migracao-01-entrada-por-cpf.sql`](migracao-01-entrada-por-cpf.sql) **não é
necessário** em banco novo; ele existe para bancos criados antes daquela
mudança.

### 3. Rodar a migração 02

SQL Editor → cole [`migracao-02-indice-mensagem-por-loja.sql`](migracao-02-indice-mensagem-por-loja.sql)
→ **Run**.

Esta **não** está no `schema.sql` e precisa ser rodada à parte. É o índice que
impede o painel de varrer a tabela `mensagem` de todas as lojas para descobrir
quem está esperando resposta.

### 4. Desligar a confirmação de e-mail

**Authentication → Providers → Email** → desmarque *Confirm email*.

Sem isso o cadastro nasce sem sessão e você não chega no painel. Em produção,
ligue de volta.

### 5. Trocar as chaves no `.env.local`

De **Project Settings → API Keys** do projeto novo:

```
NEXT_PUBLIC_SUPABASE_URL=https://NOVOREF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Duas armadilhas já conhecidas:

- Cole a URL **sem** `/rest/v1/` no fim. O cliente Supabase anexa o caminho
  sozinho; com ele a mais, toda consulta e o login quebram — e falham só na
  hora de usar, não na hora de subir.
- A `PORTAL_SECRET` **não muda**. Ela é nossa, não do Supabase, e trocá-la
  derrubaria a confirmação de todos os clientes que já estão no portal.

Reinicie o `npm run dev` depois.

### 6. Criar a conta e a loja

Abra `/entrar` → **Não tenho conta — cadastrar minha loja** → preencha os dados
da assistência em `/comecar`.

O projeto novo tem um `auth.users` vazio, então o login é criado do zero. Nada
de recuperar senha antiga.

### 7. Popular a demonstração

SQL Editor → cole [`seed-demo.sql`](seed-demo.sql) inteiro → **Run**.

Com uma loja só no banco ele acha a loja sozinho — não é preciso editar nada.
Havendo mais de uma, ele para e pede o nome exato, em vez de encher a loja
errada de OS falsa.

### 8. Conferir

```sql
select 'loja' t, count(*) from loja
union all select 'cliente',  count(*) from cliente
union all select 'os',       count(*) from os
union all select 'mensagem', count(*) from mensagem
order by 1;
```

Esperado: 1 loja, 10 clientes, 10 OS. Depois abra o painel e veja se
**Mensagens novas** mostra alguém — é o que prova que os gatilhos e a RLS
subiram junto.

---

## Quando houver dado real: dump e restore

Só a partir do dia em que existir OS de cliente de verdade.

O dump de dados da CLI roda com `--schema "*"` e a lista de exclusão **não tem
o schema `auth`** (só a tabela `auth.schema_migrations`). Ou seja, `auth.users`
vem junto com os hashes de senha, e os `user_id` continuam os mesmos — o que
importa, porque `loja_usuario.user_id` aponta para eles. Ninguém precisa
redefinir senha.

Não vêm: arquivos do Storage, e as configurações do painel do Supabase
(confirmação de e-mail, provedores, URLs de redirect).

Connection strings em **Project Settings → Database → Connection string → URI**,
usando a conexão direta (porta 5432), não o pooler.

```bash
ANTIGO="postgresql://postgres:SENHA@db.REFANTIGO.supabase.co:5432/postgres"
NOVO="postgresql://postgres:SENHA@db.REFNOVO.supabase.co:5432/postgres"

npx supabase db dump --db-url "$ANTIGO" -f papeis.sql   --role-only
npx supabase db dump --db-url "$ANTIGO" -f esquema.sql
npx supabase db dump --db-url "$ANTIGO" -f dados.sql    --data-only --use-copy

psql "$NOVO" -f papeis.sql
psql "$NOVO" -f esquema.sql
psql "$NOVO" -f dados.sql
```

Compare as contagens das duas pontas antes de apagar o projeto antigo, e
confira `auth.users` com atenção — é o que quebra em silêncio e só aparece
quando alguém tenta entrar.
