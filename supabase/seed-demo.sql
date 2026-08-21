-- =====================================================================
--  OS de demonstração
-- =====================================================================
--
--  Uma loja recém-criada abre o painel em "Nenhuma OS por aqui ainda", e
--  não existe demonstração possível a partir de uma tela vazia. Este
--  script enche uma loja com dez ordens espalhadas pelo ciclo de vida:
--  uma parada esperando aprovação há três dias (a que o painel destaca no
--  topo), uma com mensagem do cliente por ler, uma aguardando peça, e duas
--  entregues com a garantia correndo — sendo que uma está perto de vencer.
--
--  Os CPFs têm dígito verificador válido de propósito. `cpfValido` em
--  lib/format.ts recusa CPF inventado, e a entrada por CPF é justamente a
--  primeira tela que se mostra numa visita.
--
--  Os IMEIs têm 15 dígitos de propósito: é com eles que se demonstra a
--  busca do painel, que era onde estava o bug do int4.
--
--  COMO USAR
--    1. Crie a loja pela interface (/comecar).
--    2. Cole o arquivo inteiro no SQL Editor do Supabase e rode.
--
--  Em banco novo, com uma loja só, não é preciso editar nada — o script
--  acha a loja sozinho. Com mais de uma loja ele PARA e pede o nome, em
--  vez de escolher no chute: encher a loja errada de OS falsa é o tipo de
--  coisa que só se descobre com o cliente na frente.
--
--  Para repetir antes da próxima visita, rode antes o bloco de limpeza
--  que está no fim do arquivo.
-- =====================================================================


-- ---------------------------------------------------------------------
--  Qual loja encher
--
--  Com uma loja só no banco — o caso de um projeto recém-criado — não é
--  preciso mexer em nada aqui. Havendo mais de uma, troque o null pelo
--  nome exato da loja.
--
--  Nada de psql aqui (\set e afins): o SQL Editor do Supabase não executa
--  meta-comando, então a escolha é uma tabela temporária comum.
-- ---------------------------------------------------------------------
create temp table _alvo as select null::text as nome;   -- ex.: 'FixCell Centro'

create temp table _loja as
  select l.id
    from loja l
   where (select nome from _alvo) is null
      or l.nome = (select nome from _alvo)
   limit 2;

do $$
declare
  n int;
begin
  select count(*) into n from _loja;

  if n = 0 then
    raise exception
      'Nenhuma loja encontrada. Crie a loja pela interface (/comecar) antes de rodar este seed.';
  end if;

  -- Para de propósito em vez de pegar a primeira: encher a loja errada de
  -- OS falsa é o tipo de erro que só aparece com o cliente na frente.
  if n > 1 then
    raise exception
      'Há mais de uma loja neste banco. Escreva o nome exato no lugar do null, na linha "create temp table _alvo". Veja os nomes com: select nome from loja;';
  end if;
end $$;


-- ---------------------------------------------------------------------
--  Clientes
-- ---------------------------------------------------------------------
insert into cliente (loja_id, nome, telefone, documento)
select l.id, d.nome, d.tel, d.cpf
from _loja l
cross join (values
  ('Marlene Aparecida da Silva', '27988140322', '04157290844'),
  ('Rogério Pinto do Amaral',    '27997452188', '11830476572'),
  ('Cleide Nascimento Barros',   '27981209744', '29746105361'),
  ('Josué Ferreira Lima',        '27995038611', '36081529460'),
  ('Tarcísio Ramos de Oliveira', '27988675109', '45207316826'),
  ('Vanderlei Souza Andrade',    '27996714250', '50924683198'),
  ('Elaine Cristina Moraes',     '27981553470', '67315842071'),
  ('Antônio Carlos Bispo',       '27997308142', '71402958676'),
  ('Sirlene Gomes da Costa',     '27988249067', '82630741508'),
  ('Domingos Neto Ferraz',       '27995862310', '93568124700')
) as d(nome, tel, cpf);


-- ---------------------------------------------------------------------
--  Aparelhos
-- ---------------------------------------------------------------------
insert into aparelho (loja_id, cliente_id, marca, modelo, cor, imei)
select l.id, c.id, d.marca, d.modelo, d.cor, d.imei
from _loja l
cross join (values
  ('27988140322', 'Samsung',  'Galaxy A54',              'Preto',      '356938035643809'),
  ('27997452188', 'Apple',    'iPhone 12',               'Azul',       '354829106733215'),
  ('27981209744', 'Xiaomi',   'Redmi Note 11',           'Cinza',      '869104558712043'),
  ('27995038611', 'Motorola', 'Moto G54',                'Grafite',    '357610924488316'),
  ('27988675109', 'Apple',    'iPhone 11',               'Branco',     '355062108844927'),
  ('27996714250', 'Samsung',  'Galaxy S21',              'Prata',      '352914760035182'),
  ('27981553470', 'Apple',    'iPhone 13',               'Meia-noite', '356701943328605'),
  ('27997308142', 'Xiaomi',   'Poco X5',                 'Azul',       '869217334091568'),
  ('27988249067', 'Motorola', 'Edge 30',                 'Preto',      '358820174466093'),
  ('27995862310', 'Apple',    'iPhone SE (2ª geração)',  'Vermelho',   '356104882290471')
) as d(tel, marca, modelo, cor, imei)
join cliente c on c.loja_id = l.id and c.telefone = d.tel;


-- ---------------------------------------------------------------------
--  As ordens de serviço
--
--  As duas que terminam entregues nascem em 'pronto' e são entregues por
--  UPDATE mais abaixo. O gatilho da garantia é BEFORE UPDATE: inserir já
--  com status 'entregue' deixaria `garantia_ate` vazia, que é justamente
--  o campo que se mostra na demonstração.
-- ---------------------------------------------------------------------
insert into os (loja_id, cliente_id, aparelho_id, status, defeito_relatado, diagnostico,
                prazo_estimado, valor_orcado, criado_em, orcamento_enviado_em, aprovado_em)
select
  l.id, c.id, a.id, d.status::os_status, d.defeito, d.diagnostico,
  case when d.prazo is null then null
       else (now() - make_interval(days => d.dias) + make_interval(days => d.prazo))::date
  end,
  d.valor,
  now() - make_interval(days => d.dias),
  case when d.valor is null then null
       else now() - make_interval(days => greatest(d.dias - 1, 0))
  end,
  case when d.status in ('aprovado', 'aguardando_peca', 'em_reparo', 'pronto')
       then now() - make_interval(days => greatest(d.dias - 2, 0))
  end
from _loja l
cross join (values
  ('27988140322', 'orcamento_enviado', 3,  480.00, 3,
   'Tela trincada de ponta a ponta. O touch ainda responde',
   'Vidro e display comprometidos. Troca do conjunto completo.'),
  ('27997452188', 'orcamento_enviado', 0,  390.00, 4,
   'Não carrega. Só liga se ficar na tomada',
   'Conector de carga oxidado. Substituição do flex.'),
  ('27981209744', 'aprovado',          5,  220.00, 2,
   'A bateria acaba em duas horas com o celular parado',
   'Bateria com 71% de saúde e ciclos no limite. Troca.'),
  ('27995038611', 'diagnostico',       1,  null,   null,
   'Caiu na piscina no domingo. Não liga de jeito nenhum',
   'Aparelho aberto. Oxidação na placa, avaliando o alcance.'),
  ('27988675109', 'aguardando_peca',   9,  350.00, 7,
   'Câmera de trás saindo embaçada, parece que tem água dentro',
   'Módulo da câmera com infiltração. Peça pedida ao fornecedor.'),
  ('27996714250', 'em_reparo',         6,  290.00, 2,
   'Parou de reconhecer o chip depois de uma queda',
   'Leitor de SIM solto do berço. Em substituição na bancada.'),
  ('27981553470', 'pronto',            4,  890.00, 3,
   'Tela trincada. Caiu da mesa',
   'Troca do conjunto de tela. Testado, touch e Face ID funcionando.'),
  ('27997308142', 'recebido',          0,  null,   null,
   'O som do alto-falante sumiu, só escuta no fone',
   null),
  ('27988249067', 'pronto',            18, 640.00, 3,
   'Troca de tela. O aparelho caiu na calçada',
   'Conjunto de tela substituído e testado.'),
  ('27995862310', 'pronto',            82, 180.00, 2,
   'Botão de ligar afundado, não responde',
   'Flex do botão power substituído.')
) as d(tel, status, dias, valor, prazo, defeito, diagnostico)
join cliente  c on c.loja_id = l.id and c.telefone = d.tel
join aparelho a on a.cliente_id = c.id;


-- ---------------------------------------------------------------------
--  Linhas do orçamento
-- ---------------------------------------------------------------------
insert into os_item (os_id, loja_id, descricao, tipo, quantidade, valor_unitario)
select o.id, o.loja_id, d.descricao, d.tipo, 1, d.valor
from os o
join cliente c on c.id = o.cliente_id
cross join (values
  ('27988140322', 'Tela AMOLED Galaxy A54',            'peca',    380.00),
  ('27988140322', 'Mão de obra — troca de tela',       'servico', 100.00),
  ('27997452188', 'Conector de carga iPhone 12',       'peca',    240.00),
  ('27997452188', 'Mão de obra — troca do conector',   'servico', 150.00),
  ('27981209744', 'Bateria Redmi Note 11',             'peca',    140.00),
  ('27981209744', 'Mão de obra — troca de bateria',    'servico',  80.00),
  ('27988675109', 'Câmera traseira iPhone 11',         'peca',    230.00),
  ('27988675109', 'Mão de obra',                       'servico', 120.00),
  ('27996714250', 'Leitor de SIM Galaxy S21',          'peca',    170.00),
  ('27996714250', 'Mão de obra',                       'servico', 120.00),
  ('27981553470', 'Tela iPhone 13',                    'peca',    690.00),
  ('27981553470', 'Mão de obra — troca de tela',       'servico', 200.00),
  ('27988249067', 'Tela Motorola Edge 30',             'peca',    470.00),
  ('27988249067', 'Mão de obra — troca de tela',       'servico', 170.00),
  ('27995862310', 'Flex do botão power iPhone SE',     'peca',     90.00),
  ('27995862310', 'Mão de obra',                       'servico',  90.00)
) as d(tel, descricao, tipo, valor)
where c.telefone = d.tel
  and o.loja_id = (select id from _loja);


-- ---------------------------------------------------------------------
--  As entregas — por UPDATE, para o gatilho calcular a garantia
--
--  A de 82 dias existe para a demonstração ter uma garantia perto de
--  vencer: é a conversa que faz o dono entender para que serve a data.
-- ---------------------------------------------------------------------
update os o
set status = 'entregue',
    entregue_em = now() - make_interval(days => d.dias_entrega),
    pagamento = 'pago',
    valor_final = o.valor_orcado
from (values
  ('27988249067', 16),
  ('27995862310', 80)
) as d(tel, dias_entrega)
where o.cliente_id = (select id from cliente
                      where telefone = d.tel and loja_id = (select id from _loja))
  and o.loja_id = (select id from _loja);


-- ---------------------------------------------------------------------
--  Uma mensagem por ler
--
--  Sem ela o painel nunca mostra o destaque "Mensagem nova", que é uma
--  das coisas que vale mostrar: a conversa fica presa à OS certa, e não
--  perdida no WhatsApp do balcão.
-- ---------------------------------------------------------------------
insert into mensagem (os_id, loja_id, autor, texto, lida, criado_em)
select o.id, o.loja_id, 'cliente',
       'Boa tarde! Consigo buscar amanhã de manhã antes das 10h?', false,
       now() - interval '4 hours'
from os o
join cliente c on c.id = o.cliente_id
where c.telefone = '27988140322'
  and o.loja_id = (select id from _loja);


-- ---------------------------------------------------------------------
--  Conferência — é isto que deve aparecer no painel
-- ---------------------------------------------------------------------
select o.numero,
       o.codigo,
       c.nome as cliente,
       a.marca || ' ' || a.modelo as aparelho,
       o.status,
       o.valor_orcado,
       o.garantia_ate
from os o
join cliente  c on c.id = o.cliente_id
join aparelho a on a.id = o.aparelho_id
where o.loja_id = (select id from _loja)
order by o.numero;


-- =====================================================================
--  LIMPEZA — para gerar tudo de novo antes da próxima visita.
--
--  Apaga TODOS os clientes da loja, e com eles os aparelhos e as OS, em
--  cascata. Confira o nome duas vezes: numa loja de verdade isto é
--  irreversível.
-- =====================================================================
-- delete from cliente
--  where loja_id = (select id from loja where nome = 'Assistência Demo Bancada');
