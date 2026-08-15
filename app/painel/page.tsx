import Link from "next/link";
import { exigirLoja } from "@/lib/sessao-loja";
import { supabaseServidor } from "@/lib/supabase/server";
import { ABERTOS, STATUS, ehStatus, type OsStatus } from "@/lib/status";
import { desde, moeda, soDigitos } from "@/lib/format";
import { EtiquetaStatus } from "@/components/etiqueta-status";
import type { OsCompleta } from "@/lib/types";

/**
 * A lista de OS — a tela em que a loja passa o dia.
 *
 * Ordem de leitura pensada para o balcão: primeiro o que está travado
 * esperando o cliente responder (a loja não pode fazer nada e o dinheiro
 * está parado), depois quem tem mensagem nova, depois o resto por data.
 */
export default async function Painel({ searchParams }: PageProps<"/painel">) {
  const { loja } = await exigirLoja();
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
    if (/^\d+$/.test(busca)) alvos.push(`numero.eq.${busca}`);
    if (clientes?.length) alvos.push(`cliente_id.in.(${clientes.map((c) => c.id)})`);
    if (aparelhos?.length) alvos.push(`aparelho_id.in.(${aparelhos.map((a) => a.id)})`);

    consulta = consulta.or(alvos.join(","));
  }

  const [{ data: lista }, { data: naoLidas }, { data: contagem }] = await Promise.all([
    consulta,
    supabase.from("mensagem").select("os_id").eq("autor", "cliente").eq("lida", false),
    supabase.from("os").select("status"),
  ]);

  const ordens = (lista ?? []) as unknown as OsCompleta[];
  const comMensagem = new Set((naoLidas ?? []).map((m) => m.os_id));

  const porStatus = new Map<string, number>();
  for (const { status } of contagem ?? []) {
    porStatus.set(status, (porStatus.get(status) ?? 0) + 1);
  }
  const abertas = ABERTOS.reduce((t, s) => t + (porStatus.get(s) ?? 0), 0);

  const ordenadas = [...ordens].sort((a, b) => {
    const peso = (o: OsCompleta) =>
      (o.status === "orcamento_enviado" ? 0 : 2) - (comMensagem.has(o.id) ? 1 : 0);
    return peso(a) - peso(b);
  });

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Ordens de serviço
          </h1>
          <p className="mt-1 text-sm text-slate-500">
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

      <nav className="mb-4 flex flex-wrap gap-1.5">
        <Filtro atual={filtro} valor="abertas" busca={busca}>
          Em andamento ({abertas})
        </Filtro>
        {(["orcamento_enviado", "aguardando_peca", "pronto", "entregue"] as OsStatus[]).map(
          (s) => (
            <Filtro key={s} atual={filtro} valor={s} busca={busca}>
              {STATUS[s].label} ({porStatus.get(s) ?? 0})
            </Filtro>
          ),
        )}
        <Filtro atual={filtro} valor="todas" busca={busca}>
          Todas
        </Filtro>
      </nav>

      {ordenadas.length === 0 ? (
        <div className="cartao p-12 text-center">
          <p className="font-medium text-slate-700">
            {busca ? "Nada encontrado para essa busca." : "Nenhuma OS por aqui ainda."}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {busca
              ? "Tente o código do comprovante ou parte do nome do cliente."
              : "Cadastre a primeira quando um aparelho chegar no balcão."}
          </p>
          {!busca && (
            <Link href="/painel/os/nova" className="btn-primario mt-6">
              Cadastrar primeira OS
            </Link>
          )}
        </div>
      ) : (
        <ul className="cartao divide-y divide-slate-100">
          {ordenadas.map((os) => (
            <li key={os.id}>
              <Link
                href={`/painel/os/${os.id}`}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 transition hover:bg-slate-50"
              >
                <div className="w-20 shrink-0">
                  <p className="font-semibold text-slate-900">#{os.numero}</p>
                  <p className="codigo-os text-xs text-slate-400">{os.codigo}</p>
                </div>

                <div className="min-w-52 flex-1">
                  <p className="font-medium text-slate-900">{os.cliente.nome}</p>
                  <p className="truncate text-sm text-slate-500">
                    {os.aparelho.marca} {os.aparelho.modelo} · {os.defeito_relatado}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {comMensagem.has(os.id) && (
                    <span className="etiqueta bg-marca-50 text-marca-700 ring-marca-200">
                      Mensagem nova
                    </span>
                  )}
                  <EtiquetaStatus status={os.status} />
                </div>

                <div className="w-28 text-right">
                  <p className="font-medium text-slate-900">
                    {moeda(os.valor_final ?? os.valor_orcado)}
                  </p>
                  <p className="text-xs text-slate-400">
                    {os.pagamento === "pago"
                      ? "Pago"
                      : os.pagamento === "sinal"
                        ? `Sinal ${moeda(os.valor_sinal)}`
                        : "Em aberto"}
                  </p>
                </div>

                <div className="w-24 text-right text-xs text-slate-400">
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
  children,
}: {
  atual: string;
  valor: string;
  busca: string;
  children: React.ReactNode;
}) {
  const ativo = atual === valor;
  return (
    <Link
      href={`/painel?status=${valor}${busca ? `&q=${encodeURIComponent(busca)}` : ""}`}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
        ativo
          ? "bg-marca-700 text-white"
          : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
      }`}
    >
      {children}
    </Link>
  );
}
