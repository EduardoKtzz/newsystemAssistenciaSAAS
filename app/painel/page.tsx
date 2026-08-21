import Link from "next/link";
import { exigirLoja } from "@/lib/sessao-loja";
import { supabaseServidor } from "@/lib/supabase/server";
import { ABERTOS, ehStatus } from "@/lib/status";
import { desde, moeda, soDigitos } from "@/lib/format";
import { EtiquetaStatus } from "@/components/etiqueta-status";
import type { OsCompleta } from "@/lib/types";

/*
  Os filtros da barra.

  O rótulo é escrito à mão em vez de sair de STATUS[s].label porque aqui a
  palavra está no plural: o filtro fala de um conjunto ("Entregues"), e a
  etiqueta na linha fala de uma OS só ("Entregue"). Pluralizar em
  lib/status.ts arrastaria o plural para dentro da etiqueta e para o portal
  do cliente, que dizem a coisa certa hoje.

  "Aguardando peça" saiu da barra. O status continua existindo, continua
  aparecendo na etiqueta da linha e continua dentro de "Em andamento" — o
  que saiu foi o atalho, que competia por espaço com os quatro momentos em
  que alguém precisa AGIR: o orçamento parado, o aparelho pronto esperando
  retirada, o que já saiu, e o total.
*/
const FILTROS = [
  { valor: "abertas", label: "Em andamento" },
  { valor: "orcamento_enviado", label: "Orçamento enviado" },
  { valor: "pronto", label: "Pronto para retirada" },
  { valor: "entregue", label: "Entregues" },
  { valor: "todas", label: "Todos" },
] as const;

/*
  Quantas mensagens recentes são lidas para descobrir quem falou por último.

  Só interessa a ÚLTIMA mensagem de cada conversa, e o PostgREST não faz
  "distinct on" — então a saída é ler as mais novas e ficar com a primeira
  aparição de cada OS. O teto existe para a consulta não crescer junto com o
  histórico da loja: uma conversa que ficou sem resposta e não recebeu nada
  há mais de duas mil mensagens não é mais um cliente esperando no telefone,
  é arqueologia. Se a loja passar disso em volume diário, o lugar certo da
  conta é uma view no banco.
*/
const MENSAGENS_RECENTES = 2000;

/*
  Quantos ids cabem na URL do filtro de conversas.

  O .in() do PostgREST não é um POST com corpo: o postgrest-js escreve
  "id=in.(uuid,uuid,...)" na query string de um GET, e o URLSearchParams
  ainda percent-encoda vírgula e parêntese. Cada UUID custa ~39 bytes de
  URL, e o próprio postgrest-js trata 8000 como o teto do servidor — a
  biblioteca chega a sugerir RPC "ao filtrar com arrays grandes (200+ ids)".

  Medido nesta consulta, que já carrega select aninhado e order: 200 ids dão
  7.959 caracteres. Encostado demais. 150 dá ~6KB, com folga.

  O que acontecia sem este teto era pior que um erro: o gateway responde
  414, o supabase-js devolve { data: null, error }, e a tela imprimia
  "Toda mensagem de cliente já teve resposta da loja" ao lado de um chip
  dizendo "(250)". O atendente lê o "está tudo em dia" e vai embora.

  O lugar definitivo desta conta é o banco — uma view com
  "distinct on (os_id) ... order by os_id, criado_em desc" devolveria o
  conjunto sem passar id nenhum pela URL, e de quebra mataria o teto de
  MENSAGENS_RECENTES. Enquanto ela não existe, o corte é explícito e a tela
  avisa que cortou, em vez de mentir por omissão.
*/
const IDS_NA_URL = 150;

/**
 * Conversas em que o cliente falou por último — as que esperam a loja.
 *
 * "Não respondida" é mais largo que "não lida", e é o que interessa aqui.
 * marcarLidas() dispara quando a janela da conversa abre, e o campo de
 * resposta mora dentro dessa janela: logo toda mensagem não lida é também
 * não respondida, mas a recíproca é falsa. O caso que escapava é justamente
 * o pior — o atendente abriu a conversa no balcão, leu, foi atender outra
 * pessoa e nunca respondeu. Para quem está do outro lado, ler sem responder
 * é o mesmo que não ter lido.
 *
 * Com dois autores possíveis em mensagem ('loja' e 'cliente'; 'sistema'
 * existe no enum, mas nada escreve com ele aqui), a conta é só olhar quem
 * assina a mensagem mais nova de cada OS.
 *
 * Recebe a lista já ordenada da mais nova para a mais antiga.
 */
function aguardandoLoja(recentes: { os_id: string; autor: string }[] | null) {
  const espera = new Set<string>();
  const vista = new Set<string>();
  for (const m of recentes ?? []) {
    if (vista.has(m.os_id)) continue;
    vista.add(m.os_id);
    if (m.autor === "cliente") espera.add(m.os_id);
  }
  return espera;
}

/**
 * A lista de OS — a tela em que a loja passa o dia.
 *
 * Ordem de leitura pensada para o balcão: primeiro o que está travado
 * esperando o cliente responder (a loja não pode fazer nada e o dinheiro
 * está parado), depois quem tem mensagem nova, depois o resto por data.
 */
export default async function Painel({ searchParams }: PageProps<"/painel">) {
  const params = await searchParams;
  const supabase = await supabaseServidor();

  const filtro = typeof params.status === "string" ? params.status : "abertas";

  // O `.or()` do PostgREST é uma string com sintaxe própria: vírgula separa
  // condições e parênteses delimitam listas. Um nome com vírgula ("Silva,
  // João") ou um ponto viraria uma condição malformada e derrubaria a busca,
  // então esses caracteres saem antes de a consulta ser montada.
  const busca = (typeof params.q === "string" ? params.q : "")
    .trim()
    .replace(/[,()."'\\%*]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 60);

  /*
    A sessão sai na frente, mas SEM await — e é essa vírgula que vale meio
    segundo por clique.

    exigirLoja() era a primeira linha desta função, e como as consultas de
    dados vinham depois, elas só saíam quando ela voltasse. Duas viagens em
    fila: uma para resolver a loja do usuário, outra para buscar as OS. Com
    o banco em Oregon, ~700ms cada, e o log mostrava exatamente isso —
    "application-code: 1433ms".

    Só que as consultas NÃO dependem dela. Quem recorta os dados por loja é
    a RLS do Postgres (loja_id = minha_loja()), que lê o token da própria
    requisição — não um id que este arquivo passe. A única coisa que a
    página usa da sessão é loja.nome, para escrever o subtítulo. Então as
    duas coisas podem viajar juntas e se encontrar no fim.

    Disparar consulta antes de conferir a sessão parece perigoso e não é: a
    RLS não pergunta a este código quem está logado. Sem sessão válida elas
    voltam vazias, e o exigirLoja() redireciona para /entrar do mesmo jeito
    — só que sem ter feito a tela esperar por isso.
  */
  const sessao = exigirLoja();

  // Estas três não dependem da lista, e a lista só depende delas no filtro
  // de conversas. Saem juntas com a sessão.
  const apoio = Promise.all([
    supabase.from("mensagem").select("os_id").eq("autor", "cliente").eq("lida", false),
    supabase
      .from("mensagem")
      .select("os_id, autor")
      .order("criado_em", { ascending: false })
      .limit(MENSAGENS_RECENTES),
    supabase.from("os").select("status"),
  ]);

  let consulta = supabase
    .from("os")
    .select("*, cliente:cliente_id(*), aparelho:aparelho_id(*)")
    .order("criado_em", { ascending: false })
    .limit(200);

  if (filtro === "abertas") consulta = consulta.in("status", ABERTOS);
  else if (ehStatus(filtro)) consulta = consulta.eq("status", filtro);

  // A busca cobre quatro coisas diferentes que o atendente pode ter na mão:
  // o código do comprovante, o número da OS, o nome/telefone do cliente e o
  // modelo/IMEI do aparelho. Como as três últimas moram em outras tabelas,
  // resolvemos os ids primeiro — `.or()` do PostgREST não cruza tabelas.
  if (busca) {
    const [{ data: clientes }, { data: aparelhos }] = await Promise.all([
      supabase
        .from("cliente")
        .select("id")
        .or(`nome.ilike.%${busca}%,telefone.ilike.%${soDigitos(busca) || busca}%`)
        .limit(50),
      supabase
        .from("aparelho")
        .select("id")
        .or(`modelo.ilike.%${busca}%,marca.ilike.%${busca}%,imei.ilike.%${busca}%`)
        .limit(50),
    ]);

    const alvos = [`codigo.eq.${busca.toUpperCase()}`];
    // Até 9 dígitos, e não \d+: `os.numero` é int4, e um IMEI de 15
    // dígitos ou um telefone de 11 estoura o tipo. O PostgREST derruba a
    // consulta inteira com erro 22003, a lista volta nula e a tela diz
    // "Nada encontrado" — justamente para o IMEI, que o campo pede.
    if (/^\d{1,9}$/.test(busca)) alvos.push(`numero.eq.${busca}`);
    if (clientes?.length) alvos.push(`cliente_id.in.(${clientes.map((c) => c.id)})`);
    if (aparelhos?.length) alvos.push(`aparelho_id.in.(${aparelhos.map((a) => a.id)})`);

    consulta = consulta.or(alvos.join(","));
  }

  // O único filtro que precisa das mensagens ANTES de perguntar a lista.
  // Aqui as duas viagens são obrigatoriamente uma depois da outra; nos
  // outros filtros elas saem juntas, logo abaixo.
  if (filtro === "mensagens") {
    const [, { data: recentes }] = await apoio;
    consulta = consulta.in("id", [...aguardandoLoja(recentes)].slice(0, IDS_NA_URL));
  }

  // `error` é lido, e não descartado. Sem isso, lista vazia porque o banco
  // respondeu "nada" e lista vazia porque o banco NÃO respondeu imprimem a
  // mesma frase — e a segunda manda o atendente embora achando que está em dia.
  const [
    { loja },
    [{ data: naoLidas }, { data: recentes }, { data: contagem }],
    { data: lista, error: erroLista },
  ] = await Promise.all([sessao, apoio, consulta]);

  const comMensagem = new Set((naoLidas ?? []).map((m) => m.os_id));
  const esperandoResposta = aguardandoLoja(recentes);
  const cortouLista = filtro === "mensagens" && esperandoResposta.size > IDS_NA_URL;

  const porStatus = new Map<string, number>();
  for (const { status } of contagem ?? []) {
    porStatus.set(status, (porStatus.get(status) ?? 0) + 1);
  }
  const abertas = ABERTOS.reduce((t, s) => t + (porStatus.get(s) ?? 0), 0);

  const ordens = (lista ?? []) as unknown as OsCompleta[];

  const ordenadas = [...ordens].sort((a, b) => {
    const peso = (o: OsCompleta) =>
      (o.status === "orcamento_enviado" ? 0 : 2) - (comMensagem.has(o.id) ? 1 : 0);
    return peso(a) - peso(b);
  });

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 escuro:text-slate-100">
            Celulares em manutenção
          </h1>
          <p className="mt-1 text-sm text-slate-500 escuro:text-slate-400">
            {abertas} em andamento na {loja.nome}
          </p>
        </div>

        <form className="flex gap-2">
          <input type="hidden" name="status" value={filtro} />
          <input
            name="q"
            defaultValue={busca}
            className="campo w-64"
            placeholder="Código, cliente, modelo ou IMEI"
          />
          <button type="submit" className="btn-secundario">
            Buscar
          </button>
        </form>
      </div>

      <nav className="mb-4 flex flex-wrap items-center gap-1.5">
        {FILTROS.map((f) => (
          <Filtro key={f.valor} atual={filtro} valor={f.valor} busca={busca}>
            {f.label}
            {f.valor === "abertas"
              ? ` (${abertas})`
              : f.valor === "todas"
                ? ""
                : ` (${porStatus.get(f.valor) ?? 0})`}
          </Filtro>
        ))}

        {/* Encostado na direita (ml-auto) porque não é irmão dos outros: os de
            trás recortam a lista por etapa do conserto, e este recorta por
            quem está esperando a loja falar. Misturado na fileira, viraria
            "mais um status" e sumiria entre eles.

            O ponto só aparece com alguém na fila. Um marcador que está sempre
            aceso não avisa nada — vira parte do desenho do botão. */}
        <Filtro atual={filtro} valor="mensagens" busca={busca} extraClasse="ml-auto">
          {esperandoResposta.size > 0 && (
            <span
              aria-hidden
              className={`size-1.5 rounded-full ${
                filtro === "mensagens" ? "bg-white" : "bg-marca-500"
              }`}
            />
          )}
          Mensagens novas (
          {cortouLista ? `${IDS_NA_URL} de ${esperandoResposta.size}` : esperandoResposta.size})
        </Filtro>
      </nav>

      {ordenadas.length === 0 ? (
        <div className="cartao p-12 text-center">
          <p className="font-medium text-slate-700 escuro:text-slate-300">
            {erroLista
              ? "Não consegui carregar a lista."
              : busca
                ? "Nada encontrado para essa busca."
                : filtro === "mensagens"
                  ? "Nenhuma conversa esperando você."
                  : "Nenhuma OS por aqui ainda."}
          </p>
          <p className="mt-1 text-sm text-slate-500 escuro:text-slate-400">
            {erroLista
              ? "O banco respondeu com erro — isto NÃO quer dizer que está tudo em dia. Recarregue a página."
              : busca
                ? "Tente o código do comprovante ou parte do nome do cliente."
                : filtro === "mensagens"
                  ? "Toda mensagem de cliente já teve resposta da loja."
                  : "Cadastre a primeira quando um aparelho chegar no balcão."}
          </p>
          {!busca && !erroLista && filtro !== "mensagens" && (
            <Link href="/painel/os/nova" className="btn-primario mt-6">
              Cadastrar primeiro conserto
            </Link>
          )}
        </div>
      ) : (
        <ul className="cartao divide-y divide-slate-100 escuro:divide-white/8">
          {ordenadas.map((os) => (
            <li key={os.id}>
              <Link
                href={`/painel/os/${os.id}`}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 transition hover:bg-slate-50 escuro:hover:bg-white/5"
              >
                <div className="w-20 shrink-0">
                  <p className="font-semibold text-slate-900 escuro:text-slate-100">#{os.numero}</p>
                  <p className="codigo-os text-xs text-slate-400 escuro:text-slate-500">{os.codigo}</p>
                </div>

                <div className="min-w-52 flex-1">
                  <p className="font-medium text-slate-900 escuro:text-slate-100">{os.cliente.nome}</p>
                  <p className="truncate text-sm text-slate-500 escuro:text-slate-400">
                    {os.aparelho.marca} {os.aparelho.modelo} · {os.defeito_relatado}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {comMensagem.has(os.id) && (
                    <span className="etiqueta bg-marca-50 escuro:bg-marca-500/12 text-marca-700 escuro:text-marca-300 ring-marca-200 escuro:ring-marca-400/30">
                      Mensagem nova
                    </span>
                  )}
                  <EtiquetaStatus status={os.status} />
                </div>

                <div className="w-28 text-right">
                  <p className="font-medium text-slate-900 escuro:text-slate-100">
                    {moeda(os.valor_final ?? os.valor_orcado)}
                  </p>
                  <p className="text-xs text-slate-400 escuro:text-slate-500">
                    {os.pagamento === "pago"
                      ? "Pago"
                      : os.pagamento === "sinal"
                        ? `Sinal ${moeda(os.valor_sinal)}`
                        : "Em aberto"}
                  </p>
                </div>

                <div className="w-24 text-right text-xs text-slate-400 escuro:text-slate-500">
                  {desde(os.criado_em)}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

    </>
  );
}

function Filtro({
  atual,
  valor,
  busca,
  extraClasse = "",
  children,
}: {
  atual: string;
  valor: string;
  busca: string;
  extraClasse?: string;
  children: React.ReactNode;
}) {
  const ativo = atual === valor;
  return (
    <Link
      href={`/painel?status=${valor}${busca ? `&q=${encodeURIComponent(busca)}` : ""}`}
      className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition ${extraClasse} ${
        ativo
          ? "bg-marca-700 text-white"
          : "bg-white escuro:bg-slate-900 text-slate-600 escuro:text-slate-400 ring-1 ring-slate-200 escuro:ring-white/12 hover:bg-slate-50 escuro:hover:bg-white/5"
      }`}
    >
      {children}
    </Link>
  );
}
