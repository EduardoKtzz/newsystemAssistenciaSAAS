# FixCell

Sistema para assistência técnica de celular. Duas caras do mesmo dado:

- **Painel da loja** (`/painel`) — as ordens de serviço, o orçamento, o financeiro
  e a conversa com o cliente.
- **Portal do cliente** (`/os/CODIGO`) — acompanhamento do conserto, aprovação do
  orçamento e contato com a loja, **sem login e sem app**.

SaaS multi-loja: cada assistência é um tenant isolado pela RLS do Postgres.

A landing page que vende o produto é outro projeto:
[`scrollCelulares`](../scrollCelulares).

## A decisão que organiza o resto

O cliente que precisa de acompanhamento é justamente o que está **sem celular** —
o aparelho dele está na bancada. Isso descarta senha (ele não lembra), SMS (o chip
está dentro do aparelho) e app (ele não vai instalar do PC de um parente).

Então o acesso é: **código curto impresso no comprovante + os 4 últimos dígitos do
telefone**. Abre de qualquer máquina, sem cadastro. Todo o desenho do portal sai
dessa restrição.

## Pondo para rodar

### 1. Criar o projeto no Supabase

Em [supabase.com](https://supabase.com) → **New project**. Anote a senha do banco.

### 2. Rodar o esquema

SQL Editor → cole [`supabase/schema.sql`](supabase/schema.sql) inteiro → **Run**.

Cria as tabelas, os gatilhos (número sequencial, código público, garantia) e as
políticas de RLS.

### 3. Preencher as variáveis

```bash
cp .env.local.example .env.local
```

As chaves estão em **Project Settings → API**. Gere a `PORTAL_SECRET` com:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Desligar a confirmação de e-mail (só no desenvolvimento)

**Authentication → Providers → Email** → desmarque *Confirm email*. Sem isso o
cadastro nasce sem sessão e você não chega no painel. Em produção, ligue de volta.

### 5. Subir

```bash
npm run dev
```

Abra `http://localhost:3000`, clique em **Entrar no painel**, crie a conta, cadastre
a loja e abra a primeira OS. O código que aparece na tela é o que o cliente usa em
`/os`.

## Como o isolamento entre lojas funciona

Toda tabela de negócio tem `loja_id` e uma política de RLS igual:
`loja_id = minha_loja()`. A função lê o vínculo `loja_usuario` do usuário logado.

Quem garante o isolamento é o banco, não a aplicação. Um `where` esquecido numa
query devolve zero linha em vez de vazar a loja do vizinho.

`loja` e `loja_usuario` **não têm política de INSERT** de propósito. Se tivessem,
um usuário poderia se auto-vincular a qualquer loja existente e ler as OS dela.
Criar loja passa pelo cliente admin em [`app/comecar/actions.ts`](app/comecar/actions.ts).

## E o portal, que não tem login?

O cliente não tem sessão, então a RLS não tem o que avaliar. O portal inteiro
passa pelo servidor, e [`lib/portal.ts`](lib/portal.ts) é o único arquivo que fala
com o banco em nome dele — sempre filtrando por código, sempre com a lista de
campos escrita à mão.

Nada de `select("*")` na OS ali. `senha_aparelho` mora na mesma tabela, e com `*`
qualquer coluna interna criada no futuro vazaria sozinha para a tela do cliente.

A chave `SUPABASE_SERVICE_ROLE_KEY` ignora a RLS por completo. Ela nunca pode
ganhar o prefixo `NEXT_PUBLIC_` — o `import "server-only"` no topo de
[`lib/supabase/admin.ts`](lib/supabase/admin.ts) quebra o build se alguém importar
esse módulo em um componente de cliente.

## Mapa dos arquivos

| onde | o quê |
|---|---|
| `lib/status.ts` | o ciclo de vida da OS: rótulos, cores, trilha e transições permitidas |
| `lib/portal.ts` | toda leitura/escrita do portal do cliente |
| `lib/portal-sessao.ts` | o cookie assinado que lembra a confirmação |
| `lib/sessao-loja.ts` | usuário + loja; toda página do painel começa aqui |
| `app/painel/os/[id]/` | a tela de trabalho da loja |
| `app/os/[codigo]/` | o portal do cliente |
| `app/comprovante/[id]/` | a via impressa com o código |
| `supabase/schema.sql` | esquema, gatilhos e RLS |

Status novo, rótulo diferente ou mudança de fluxo: mexa só em `lib/status.ts`. As
telas leem tudo de lá, inclusive quais botões de "mover status" aparecem.

## Regras de negócio que moram no banco

Ficam em gatilho, e não na aplicação, porque valem para qualquer caminho que
escreva na tabela:

- **Número da OS** — sequencial por loja, com lock para dois atendentes
  cadastrando ao mesmo tempo não receberem o mesmo número.
- **Código público** — 5 caracteres de um alfabeto sem `0/O`, `1/I/L` e `U`. Ele é
  ditado por telefone e copiado de papel amassado; ambiguidade vira ligação.
- **Garantia** — ao marcar `entregue`, `garantia_ate` recebe a data + os dias da
  loja. O mínimo é 90 (CDC art. 26).

## O que ainda não existe

- Fotos do aparelho na entrada (precisa do Supabase Storage)
- Estoque de peças
- Múltiplos técnicos com comissão
- Relatórios e faturamento
- Notificação automática — hoje o aviso é um link de WhatsApp que o atendente clica
