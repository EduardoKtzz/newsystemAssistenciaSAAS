-- =====================================================================
--  FixCell — esquema do banco (Supabase / Postgres)
--
--  Cole este arquivo inteiro no SQL Editor do Supabase e rode uma vez.
--  É idempotente até onde o Postgres permite: rodar de novo em banco
--  limpo funciona, rodar em banco já populado vai reclamar de duplicata.
--
--  MODELO MENTAL
--  Tudo gira em torno de UMA entidade: a Ordem de Serviço (`os`).
--  O painel da loja é a OS em modo escrita.
--  O portal do cliente é a MESMA OS em modo leitura + chat + aprovação.
--  Não existe "cópia publicada" do status — existe um dado só.
--
--  ISOLAMENTO ENTRE LOJAS
--  Toda tabela de negócio carrega `loja_id` e tem RLS ligada. A regra é
--  sempre a mesma: `loja_id = minha_loja()`. Quem garante o isolamento é
--  o banco, não o código da aplicação — se um dia um `where` for esquecido
--  numa query, o Postgres ainda devolve zero linha da loja errada.
--
--  E O CLIENTE, QUE NÃO TEM LOGIN?
--  O portal público NUNCA fala com o banco pelo navegador. Ele passa pelo
--  servidor do Next.js, que confere código + telefone e só então consulta
--  usando a service_role key (que ignora RLS e nunca sai do servidor).
--  Por isso não existe nenhuma policy para o papel `anon` aqui embaixo:
--  a ausência dela é intencional e é o que fecha a porta.
-- =====================================================================

create extension if not exists pgcrypto;


-- =====================================================================
--  TIPOS
-- =====================================================================

-- A ordem dos valores é a ordem real do fluxo da bancada.
do $$ begin
  create type os_status as enum (
    'recebido',
    'diagnostico',
    'orcamento_enviado',
    'aprovado',
    'recusado',
    'aguardando_peca',
    'em_reparo',
    'pronto',
    'entregue',
    'cancelado'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type pagamento_status as enum ('pendente', 'sinal', 'pago');
exception when duplicate_object then null; end $$;

do $$ begin
  create type autor_tipo as enum ('loja', 'cliente', 'sistema');
exception when duplicate_object then null; end $$;


-- =====================================================================
--  LOJA  (o tenant)
-- =====================================================================

create table if not exists loja (
  id           uuid primary key default gen_random_uuid(),
  nome         text not null,
  telefone     text,
  whatsapp     text,
  endereco     text,
  -- Prazo de garantia em dias. 90 é o mínimo do CDC art. 26 para
  -- serviço durável; a loja pode oferecer mais, nunca menos.
  garantia_dias int not null default 90,
  criado_em    timestamptz not null default now()
);

-- Liga um usuário do Supabase Auth à loja dele. É a tabela que a função
-- minha_loja() consulta, e portanto a raiz de todo o isolamento.
create table if not exists loja_usuario (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  loja_id    uuid not null references loja(id) on delete cascade,
  nome       text,
  papel      text not null default 'atendente',  -- dono | atendente | tecnico
  criado_em  timestamptz not null default now()
);

create index if not exists idx_loja_usuario_loja on loja_usuario(loja_id);


-- =====================================================================
--  CLIENTE E APARELHO
-- =====================================================================

create table if not exists cliente (
  id         uuid primary key default gen_random_uuid(),
  loja_id    uuid not null references loja(id) on delete cascade,
  nome       text not null,
  -- Só dígitos, sem máscara. A confirmação do portal compara os 4 últimos
  -- caracteres desta coluna, então guardar "(47) 99999-1234" quebraria a
  -- checagem para quem digita "1234".
  telefone   text not null,
  email      text,
  documento  text,
  observacao text,
  criado_em  timestamptz not null default now()
);

create index if not exists idx_cliente_loja on cliente(loja_id);
create index if not exists idx_cliente_telefone on cliente(loja_id, telefone);

-- O aparelho é entidade própria, e não texto solto dentro da OS. É isso
-- que permite responder "esse IMEI já passou aqui antes?" e enxergar
-- garantia ainda válida de um reparo anterior.
create table if not exists aparelho (
  id         uuid primary key default gen_random_uuid(),
  loja_id    uuid not null references loja(id) on delete cascade,
  cliente_id uuid not null references cliente(id) on delete cascade,
  marca      text not null,
  modelo     text not null,
  cor        text,
  imei       text,
  criado_em  timestamptz not null default now()
);

create index if not exists idx_aparelho_loja on aparelho(loja_id);
create index if not exists idx_aparelho_cliente on aparelho(cliente_id);
create index if not exists idx_aparelho_imei on aparelho(loja_id, imei);


-- =====================================================================
--  ORDEM DE SERVIÇO
-- =====================================================================

create table if not exists os (
  id          uuid primary key default gen_random_uuid(),
  loja_id     uuid not null references loja(id) on delete cascade,

  -- `numero` é sequencial por loja, para o balcão ("OS 143").
  -- `codigo` é o identificador público do portal, sorteado e global.
  -- São dois porque o número sequencial vaza volume de negócio: quem
  -- recebesse a OS 143 saberia quantos serviços a loja já fez.
  numero      int  not null,
  codigo      text not null unique,

  cliente_id  uuid not null references cliente(id)  on delete restrict,
  aparelho_id uuid not null references aparelho(id) on delete restrict,

  status           os_status not null default 'recebido',
  defeito_relatado text not null,
  diagnostico      text,

  -- Senha/padrão de desbloqueio. Dado sensível: só a loja enxerga,
  -- nunca é devolvido para o portal do cliente.
  senha_aparelho   text,
  acessorios       text,
  observacoes      text,

  prazo_estimado   date,

  valor_orcado  numeric(10,2),
  valor_final   numeric(10,2),
  valor_sinal   numeric(10,2) not null default 0,
  pagamento     pagamento_status not null default 'pendente',

  -- Carimbos do fluxo de aprovação. `aprovado_em` preenchido é a prova
  -- de que o cliente autorizou o serviço, e o motivo de existir o portal.
  orcamento_enviado_em timestamptz,
  aprovado_em          timestamptz,
  recusado_em          timestamptz,
  entregue_em          timestamptz,

  garantia_ate  date,

  -- Palpites errados de telefone no portal. Zera no acerto e trava a OS
  -- quando estoura o limite: com o código em mãos sobram só 10 mil
  -- combinações de 4 dígitos, o que um script quebra em minutos.
  tentativas_portal int not null default 0,

  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  constraint os_numero_unico_por_loja unique (loja_id, numero)
);

create index if not exists idx_os_loja_status on os(loja_id, status);
create index if not exists idx_os_loja_criado on os(loja_id, criado_em desc);
create index if not exists idx_os_cliente on os(cliente_id);
create index if not exists idx_os_aparelho on os(aparelho_id);


-- Linhas do orçamento: peças e serviços. A soma delas alimenta
-- `os.valor_orcado` quando a loja envia o orçamento.
create table if not exists os_item (
  id             uuid primary key default gen_random_uuid(),
  os_id          uuid not null references os(id) on delete cascade,
  loja_id        uuid not null references loja(id) on delete cascade,
  descricao      text not null,
  tipo           text not null default 'peca',   -- peca | servico
  quantidade     int  not null default 1 check (quantidade > 0),
  valor_unitario numeric(10,2) not null default 0,
  criado_em      timestamptz not null default now()
);

create index if not exists idx_os_item_os on os_item(os_id);


-- Histórico da OS. Cada mudança de status vira uma linha aqui, e a
-- timeline que o cliente vê é literalmente esta tabela renderizada —
-- não é uma segunda fonte de verdade que precise ser sincronizada.
create table if not exists os_evento (
  id        uuid primary key default gen_random_uuid(),
  os_id     uuid not null references os(id) on delete cascade,
  loja_id   uuid not null references loja(id) on delete cascade,
  status    os_status,
  titulo    text not null,
  descricao text,
  autor     autor_tipo not null default 'loja',
  -- Evento interno não aparece no portal (ex.: anotação técnica).
  publico   boolean not null default true,
  criado_em timestamptz not null default now()
);

create index if not exists idx_os_evento_os on os_evento(os_id, criado_em);


-- Conversa entre loja e cliente, presa à OS. É o canal de contato de
-- quem está sem celular justamente porque o celular está na bancada.
create table if not exists mensagem (
  id        uuid primary key default gen_random_uuid(),
  os_id     uuid not null references os(id) on delete cascade,
  loja_id   uuid not null references loja(id) on delete cascade,
  autor     autor_tipo not null,
  texto     text not null,
  lida      boolean not null default false,
  criado_em timestamptz not null default now()
);

create index if not exists idx_mensagem_os on mensagem(os_id, criado_em);
create index if not exists idx_mensagem_nao_lida on mensagem(loja_id, lida)
  where lida = false;


-- =====================================================================
--  CÓDIGO PÚBLICO E NUMERAÇÃO
-- =====================================================================

-- Alfabeto sem 0/O, 1/I/L e U — o código é ditado por telefone e copiado
-- de um papel amassado. Ambiguidade visual aqui vira ligação para a loja.
create or replace function gerar_codigo_os()
returns text
language plpgsql
as $$
declare
  alfabeto constant text := '23456789ABCDEFGHJKMNPQRSTVWXYZ';
  tentativa text;
  i int;
begin
  loop
    tentativa := '';
    for i in 1..5 loop
      tentativa := tentativa ||
        substr(alfabeto, 1 + floor(random() * length(alfabeto))::int, 1);
    end loop;
    exit when not exists (select 1 from os where codigo = tentativa);
  end loop;
  return tentativa;
end $$;


-- Preenche `numero` e `codigo` na inserção. O numero é o próximo da loja;
-- o lock evita que dois atendentes cadastrando ao mesmo tempo recebam
-- o mesmo número.
create or replace function os_antes_de_inserir()
returns trigger
language plpgsql
as $$
begin
  if new.codigo is null or new.codigo = '' then
    new.codigo := gerar_codigo_os();
  end if;

  if new.numero is null or new.numero = 0 then
    perform pg_advisory_xact_lock(hashtext(new.loja_id::text));
    select coalesce(max(numero), 0) + 1 into new.numero
      from os where loja_id = new.loja_id;
  end if;

  return new;
end $$;

drop trigger if exists trg_os_antes_de_inserir on os;
create trigger trg_os_antes_de_inserir
  before insert on os
  for each row execute function os_antes_de_inserir();


-- Mantém `atualizado_em` honesto sem depender da aplicação lembrar.
create or replace function tocar_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em := now();
  return new;
end $$;

drop trigger if exists trg_os_atualizado_em on os;
create trigger trg_os_atualizado_em
  before update on os
  for each row execute function tocar_atualizado_em();


-- Quando a OS é entregue, a garantia começa a contar. Fazer isso no banco
-- garante que vale para qualquer caminho que marque a entrega — painel,
-- portal ou script.
create or replace function os_ao_entregar()
returns trigger
language plpgsql
as $$
declare
  dias int;
begin
  if new.status = 'entregue' and old.status is distinct from 'entregue' then
    if new.entregue_em is null then
      new.entregue_em := now();
    end if;
    select garantia_dias into dias from loja where id = new.loja_id;
    new.garantia_ate := (new.entregue_em::date + coalesce(dias, 90));
  end if;
  return new;
end $$;

drop trigger if exists trg_os_ao_entregar on os;
create trigger trg_os_ao_entregar
  before update on os
  for each row execute function os_ao_entregar();


-- =====================================================================
--  RLS
-- =====================================================================

-- Devolve a loja do usuário logado. É SECURITY DEFINER de propósito:
-- as policies precisam ler `loja_usuario` para decidir o acesso, e se
-- essa leitura passasse pela RLS da própria tabela o Postgres entraria
-- em recursão. `search_path` fixo impede sequestro da função por um
-- schema plantado no caminho.
create or replace function minha_loja()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select loja_id from loja_usuario where user_id = auth.uid()
$$;

revoke all on function minha_loja() from public;
grant execute on function minha_loja() to authenticated;


alter table loja         enable row level security;
alter table loja_usuario enable row level security;
alter table cliente      enable row level security;
alter table aparelho     enable row level security;
alter table os           enable row level security;
alter table os_item      enable row level security;
alter table os_evento    enable row level security;
alter table mensagem     enable row level security;

-- A loja: cada usuário enxerga e edita apenas a própria.
drop policy if exists loja_le on loja;
create policy loja_le on loja
  for select to authenticated
  using (id = minha_loja());

drop policy if exists loja_atualiza on loja;
create policy loja_atualiza on loja
  for update to authenticated
  using (id = minha_loja())
  with check (id = minha_loja());

-- O vínculo: cada um vê a própria linha. Sem policy de insert/update —
-- entrar numa loja é ato administrativo, feito pelo servidor.
drop policy if exists loja_usuario_le on loja_usuario;
create policy loja_usuario_le on loja_usuario
  for select to authenticated
  using (user_id = auth.uid());

-- Tabelas de negócio: a mesma regra oito vezes. `using` filtra o que sai,
-- `with check` impede gravar linha carimbada com loja alheia.
drop policy if exists cliente_tudo on cliente;
create policy cliente_tudo on cliente
  for all to authenticated
  using (loja_id = minha_loja()) with check (loja_id = minha_loja());

drop policy if exists aparelho_tudo on aparelho;
create policy aparelho_tudo on aparelho
  for all to authenticated
  using (loja_id = minha_loja()) with check (loja_id = minha_loja());

drop policy if exists os_tudo on os;
create policy os_tudo on os
  for all to authenticated
  using (loja_id = minha_loja()) with check (loja_id = minha_loja());

drop policy if exists os_item_tudo on os_item;
create policy os_item_tudo on os_item
  for all to authenticated
  using (loja_id = minha_loja()) with check (loja_id = minha_loja());

drop policy if exists os_evento_tudo on os_evento;
create policy os_evento_tudo on os_evento
  for all to authenticated
  using (loja_id = minha_loja()) with check (loja_id = minha_loja());

drop policy if exists mensagem_tudo on mensagem;
create policy mensagem_tudo on mensagem
  for all to authenticated
  using (loja_id = minha_loja()) with check (loja_id = minha_loja());
