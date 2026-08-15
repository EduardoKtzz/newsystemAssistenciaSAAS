import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirLoja } from "@/lib/sessao-loja";
import { supabaseServidor } from "@/lib/supabase/server";
import { STATUS } from "@/lib/status";
import { data, dataHora, linkWhatsapp, moeda, telefone } from "@/lib/format";
import { somaItens, type Mensagem, type OsCompleta, type OsEvento, type OsItem } from "@/lib/types";
import { EtiquetaStatus } from "@/components/etiqueta-status";
import { BotaoEnvio } from "@/components/botao-envio";
import { Copiar } from "@/components/copiar";
import { MarcarLidas } from "./marcar-lidas";
import {
  adicionarItem,
  enviarOrcamento,
  mudarStatus,
  registrarPagamento,
  removerItem,
  responderCliente,
  salvarDiagnostico,
} from "./actions";

export default async function DetalheOs({ params, searchParams }: PageProps<"/painel/os/[id]">) {
  const { id } = await params;
  const { novo } = await searchParams;
  const { loja } = await exigirLoja();
  const supabase = await supabaseServidor();

  const { data: bruto } = await supabase
    .from("os")
    .select("*, cliente:cliente_id(*), aparelho:aparelho_id(*)")
    .eq("id", id)
    .maybeSingle();

  if (!bruto) notFound();
  const os = bruto as unknown as OsCompleta;

  const [{ data: itens }, { data: eventos }, { data: mensagens }] = await Promise.all([
    supabase.from("os_item").select("*").eq("os_id", id).order("criado_em"),
    supabase.from("os_evento").select("*").eq("os_id", id).order("criado_em", { ascending: false }),
    supabase.from("mensagem").select("*").eq("os_id", id).order("criado_em"),
  ]);

  const listaItens = (itens ?? []) as OsItem[];
  const totalItens = somaItens(listaItens);
  const temNaoLida = (mensagens ?? []).some((m) => m.autor === "cliente" && !m.lida);

  const base = process.env.NEXT_PUBLIC_URL_BASE ?? "";
  const linkPortal = `${base}/os/${os.codigo}`;

  const avisoWhatsapp = linkWhatsapp(
    os.cliente.telefone,
    `Olá ${os.cliente.nome.split(" ")[0]}! Aqui é da ${loja.nome}. ` +
      `Novidade sobre o seu ${os.aparelho.marca} ${os.aparelho.modelo}: ${STATUS[os.status].publico}. ` +
      `Acompanhe em ${linkPortal} (código ${os.codigo}).`,
  );

  return (
    <>
      <MarcarLidas osId={os.id} temNaoLida={temNaoLida} />

      <Link href="/painel" className="text-sm text-slate-500 hover:text-marca-700">
        ← Voltar para a lista
      </Link>

      {novo && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="font-semibold text-emerald-900">OS aberta.</p>
          <p className="mt-1 text-sm text-emerald-800">
            Entregue o código <strong className="codigo-os">{os.codigo}</strong> ao cliente —
            é com ele que a pessoa acompanha o conserto sem precisar de conta nem do celular.
          </p>
        </div>
      )}

      <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">OS #{os.numero}</h1>
            <EtiquetaStatus status={os.status} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Aberta em {dataHora(os.criado_em)} · atualizada em {dataHora(os.atualizado_em)}
          </p>
        </div>

        <a href={avisoWhatsapp} target="_blank" rel="noreferrer" className="btn-secundario">
          Avisar no WhatsApp
        </a>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* ---------------- coluna principal ---------------- */}
        <div className="space-y-6 lg:col-span-2">
          <section className="cartao p-6">
            <h2 className="text-sm font-semibold text-slate-700">Cliente e aparelho</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <Campo termo="Cliente" valor={os.cliente.nome} />
              <Campo termo="Telefone" valor={telefone(os.cliente.telefone)} />
              <Campo termo="Aparelho" valor={`${os.aparelho.marca} ${os.aparelho.modelo}`} />
              <Campo termo="Cor" valor={os.aparelho.cor ?? "—"} />
              <Campo termo="IMEI" valor={os.aparelho.imei ?? "não informado"} />
              <Campo termo="Acessórios" valor={os.acessorios ?? "nenhum"} />
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Problema relatado
                </dt>
                <dd className="mt-1 text-slate-900">{os.defeito_relatado}</dd>
              </div>
              {os.senha_aparelho && (
                <div className="sm:col-span-2 rounded-lg bg-amber-50 px-3 py-2">
                  <dt className="text-xs font-medium uppercase tracking-wide text-amber-700">
                    Senha / padrão — uso interno
                  </dt>
                  <dd className="mt-0.5 font-mono text-amber-900">{os.senha_aparelho}</dd>
                </div>
              )}
            </dl>
          </section>

          <section className="cartao p-6">
            <h2 className="text-sm font-semibold text-slate-700">Diagnóstico técnico</h2>
            <form action={salvarDiagnostico} className="mt-4 space-y-4">
              <input type="hidden" name="os_id" value={os.id} />
              <textarea
                name="diagnostico"
                rows={3}
                defaultValue={os.diagnostico ?? ""}
                className="campo"
                placeholder="Placa oxidada por contato com água. Necessária troca do conector de carga."
              />
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label htmlFor="prazo_estimado" className="rotulo">
                    Previsão de entrega
                  </label>
                  <input
                    id="prazo_estimado"
                    name="prazo_estimado"
                    type="date"
                    defaultValue={os.prazo_estimado?.slice(0, 10) ?? ""}
                    className="campo w-48"
                  />
                </div>
                <BotaoEnvio className="btn-secundario">Salvar diagnóstico</BotaoEnvio>
              </div>
            </form>
          </section>

          <Orcamento os={os} itens={listaItens} total={totalItens} />

          <section className="cartao p-6">
            <h2 className="text-sm font-semibold text-slate-700">Pagamento</h2>
            <form action={registrarPagamento} className="mt-4 flex flex-wrap items-end gap-3">
              <input type="hidden" name="os_id" value={os.id} />
              <div>
                <label htmlFor="pagamento" className="rotulo">
                  Situação
                </label>
                <select
                  id="pagamento"
                  name="pagamento"
                  defaultValue={os.pagamento}
                  className="campo w-40"
                >
                  <option value="pendente">Em aberto</option>
                  <option value="sinal">Sinal pago</option>
                  <option value="pago">Pago</option>
                </select>
              </div>
              <div>
                <label htmlFor="valor_sinal" className="rotulo">
                  Sinal recebido
                </label>
                <input
                  id="valor_sinal"
                  name="valor_sinal"
                  inputMode="decimal"
                  defaultValue={String(os.valor_sinal ?? 0)}
                  className="campo w-32"
                />
              </div>
              <div>
                <label htmlFor="valor_final" className="rotulo">
                  Valor final
                </label>
                <input
                  id="valor_final"
                  name="valor_final"
                  inputMode="decimal"
                  defaultValue={os.valor_final ?? ""}
                  placeholder={String(os.valor_orcado ?? "")}
                  className="campo w-32"
                />
              </div>
              <BotaoEnvio className="btn-secundario">Registrar</BotaoEnvio>
            </form>
            {os.valor_orcado != null && (
              <p className="mt-3 text-sm text-slate-500">
                Orçado {moeda(os.valor_orcado)} · sinal {moeda(os.valor_sinal)} ·{" "}
                <strong className="text-slate-800">
                  falta {moeda((os.valor_final ?? os.valor_orcado) - os.valor_sinal)}
                </strong>
              </p>
            )}
          </section>

          <section className="cartao p-6">
            <h2 className="text-sm font-semibold text-slate-700">Histórico</h2>
            <ol className="mt-4 space-y-4">
              {(eventos ?? []).map((e: OsEvento) => (
                <li key={e.id} className="flex gap-3">
                  <div
                    className={`mt-1.5 size-2 shrink-0 rounded-full ${
                      e.publico ? "bg-marca-500" : "bg-slate-300"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">
                      {e.titulo}
                      {!e.publico && (
                        <span className="ml-2 text-xs font-normal text-slate-400">interno</span>
                      )}
                      {e.autor === "cliente" && (
                        <span className="ml-2 text-xs font-normal text-emerald-600">
                          pelo cliente
                        </span>
                      )}
                    </p>
                    {e.descricao && <p className="text-sm text-slate-600">{e.descricao}</p>}
                    <p className="mt-0.5 text-xs text-slate-400">{dataHora(e.criado_em)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* ---------------- coluna lateral ---------------- */}
        <div className="space-y-6">
          <section className="cartao p-6">
            <h2 className="text-sm font-semibold text-slate-700">Mover status</h2>
            {STATUS[os.status].proximos.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                Esta OS está encerrada. Não há próximo passo.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {STATUS[os.status].proximos.map((proximo) => (
                  <form key={proximo} action={mudarStatus}>
                    <input type="hidden" name="os_id" value={os.id} />
                    <input type="hidden" name="status" value={proximo} />
                    <BotaoEnvio
                      className="btn-secundario w-full justify-start"
                      carregando="Movendo..."
                    >
                      {STATUS[proximo].label}
                    </BotaoEnvio>
                  </form>
                ))}
              </div>
            )}
            {os.garantia_ate && (
              <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                Garantia até {data(os.garantia_ate)}
              </p>
            )}
          </section>

          <section className="cartao p-6">
            <h2 className="text-sm font-semibold text-slate-700">Acesso do cliente</h2>
            <p className="codigo-os mt-3 text-center text-2xl font-bold text-slate-900">
              {os.codigo}
            </p>
            <p className="mt-2 text-center text-xs text-slate-500">
              Código + os 4 últimos dígitos do telefone
            </p>
            <div className="mt-4 space-y-2">
              <Copiar texto={linkPortal} className="btn-secundario w-full">
                Copiar link
              </Copiar>
              <Link
                href={`/comprovante/${os.id}`}
                className="btn-secundario w-full"
                target="_blank"
              >
                Imprimir comprovante
              </Link>
            </div>
          </section>

          <section className="cartao flex max-h-[32rem] flex-col p-6">
            <h2 className="text-sm font-semibold text-slate-700">
              Conversa com o cliente
              {temNaoLida && (
                <span className="ml-2 rounded-full bg-marca-600 px-2 py-0.5 text-xs text-white">
                  nova
                </span>
              )}
            </h2>

            <div className="mt-4 flex-1 space-y-3 overflow-y-auto">
              {(mensagens ?? []).length === 0 && (
                <p className="text-sm text-slate-400">
                  Nenhuma mensagem. O cliente pode escrever pelo portal mesmo sem o celular.
                </p>
              )}
              {(mensagens ?? []).map((m: Mensagem) => (
                <div
                  key={m.id}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    m.autor === "loja"
                      ? "ml-6 bg-marca-50 text-marca-900"
                      : "mr-6 bg-slate-100 text-slate-800"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.texto}</p>
                  <p className="mt-1 text-xs text-slate-400">{dataHora(m.criado_em)}</p>
                </div>
              ))}
            </div>

            <form action={responderCliente} className="mt-4 space-y-2">
              <input type="hidden" name="os_id" value={os.id} />
              <textarea
                name="texto"
                rows={2}
                required
                className="campo"
                placeholder="Responder ao cliente..."
              />
              <BotaoEnvio className="btn-primario w-full" carregando="Enviando...">
                Enviar
              </BotaoEnvio>
            </form>
          </section>
        </div>
      </div>
    </>
  );
}

function Campo({ termo, valor }: { termo: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{termo}</dt>
      <dd className="mt-1 text-slate-900">{valor}</dd>
    </div>
  );
}

/**
 * O orçamento e o estado da aprovação.
 *
 * A caixa muda de cara conforme onde a OS está: montando, esperando o
 * cliente, aprovado ou recusado. É a informação que o atendente mais olha
 * quando o telefone toca, então ela precisa responder "e aí?" de longe.
 */
function Orcamento({
  os,
  itens,
  total,
}: {
  os: OsCompleta;
  itens: OsItem[];
  total: number;
}) {
  return (
    <section className="cartao p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">Orçamento</h2>
        {os.aprovado_em && (
          <span className="etiqueta bg-emerald-100 text-emerald-800 ring-emerald-200">
            Aprovado pelo cliente em {dataHora(os.aprovado_em)}
          </span>
        )}
        {os.recusado_em && !os.aprovado_em && (
          <span className="etiqueta bg-rose-100 text-rose-800 ring-rose-200">
            Recusado em {dataHora(os.recusado_em)}
          </span>
        )}
      </div>

      {itens.length > 0 && (
        <table className="mt-4 w-full text-sm">
          <tbody className="divide-y divide-slate-100">
            {itens.map((i) => (
              <tr key={i.id}>
                <td className="py-2">
                  <span className="text-slate-900">{i.descricao}</span>
                  <span className="ml-2 text-xs text-slate-400">
                    {i.tipo === "peca" ? "peça" : "serviço"}
                  </span>
                </td>
                <td className="py-2 text-right text-slate-500">{i.quantidade}×</td>
                <td className="py-2 text-right text-slate-900">
                  {moeda(i.quantidade * Number(i.valor_unitario))}
                </td>
                <td className="w-8 py-2 text-right">
                  {!os.aprovado_em && (
                    <form action={removerItem}>
                      <input type="hidden" name="os_id" value={os.id} />
                      <input type="hidden" name="item_id" value={i.id} />
                      <button
                        type="submit"
                        className="text-slate-300 transition hover:text-rose-600"
                        aria-label={`Remover ${i.descricao}`}
                      >
                        ×
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            <tr className="font-semibold">
              <td className="py-2">Total</td>
              <td />
              <td className="py-2 text-right">{moeda(total)}</td>
              <td />
            </tr>
          </tbody>
        </table>
      )}

      {os.aprovado_em ? (
        <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Serviço autorizado por {moeda(os.valor_orcado)}. O registro da aprovação fica no
          histórico com data e hora.
        </p>
      ) : (
        <>
          <form action={adicionarItem} className="mt-4 flex flex-wrap items-end gap-2">
            <input type="hidden" name="os_id" value={os.id} />
            <div className="min-w-48 flex-1">
              <label htmlFor="descricao" className="rotulo">
                Peça ou serviço
              </label>
              <input
                id="descricao"
                name="descricao"
                required
                className="campo"
                placeholder="Tela AMOLED iPhone 12"
              />
            </div>
            <div>
              <label htmlFor="tipo" className="rotulo">
                Tipo
              </label>
              <select id="tipo" name="tipo" className="campo w-28">
                <option value="peca">Peça</option>
                <option value="servico">Serviço</option>
              </select>
            </div>
            <div>
              <label htmlFor="quantidade" className="rotulo">
                Qtd
              </label>
              <input
                id="quantidade"
                name="quantidade"
                type="number"
                min={1}
                defaultValue={1}
                className="campo w-20"
              />
            </div>
            <div>
              <label htmlFor="valor_unitario" className="rotulo">
                Valor un.
              </label>
              <input
                id="valor_unitario"
                name="valor_unitario"
                inputMode="decimal"
                required
                className="campo w-28"
                placeholder="480,00"
              />
            </div>
            <BotaoEnvio className="btn-secundario">Adicionar</BotaoEnvio>
          </form>

          {itens.length > 0 && (
            <form action={enviarOrcamento} className="mt-4 border-t border-slate-100 pt-4">
              <input type="hidden" name="os_id" value={os.id} />
              <BotaoEnvio carregando="Enviando...">
                {os.orcamento_enviado_em
                  ? `Reenviar orçamento de ${moeda(total)}`
                  : `Enviar orçamento de ${moeda(total)} ao cliente`}
              </BotaoEnvio>
              <p className="mt-2 text-xs text-slate-500">
                O cliente aprova ou recusa no portal. O valor fica congelado no envio.
              </p>
            </form>
          )}
        </>
      )}
    </section>
  );
}
