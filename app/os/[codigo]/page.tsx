import Link from "next/link";
import { STATUS } from "@/lib/status";
import { data, dataHora, diasAte, linkWhatsapp, moeda, telefone } from "@/lib/format";
import { buscarItens, buscarLinhaDoTempo, buscarMensagens, buscarOsPublica } from "@/lib/portal";
import { temAcesso } from "@/lib/portal-sessao";
import { Trilha } from "@/components/trilha";
import { BotaoEnvio } from "@/components/botao-envio";
import { FormularioConfirmacao } from "./confirmacao";
import { decidirOrcamento, mandarMensagem } from "./actions";

export default async function Portal({ params }: PageProps<"/os/[codigo]">) {
  const { codigo } = await params;
  const cod = decodeURIComponent(codigo).toUpperCase();

  // A confirmação vem antes da busca de propósito: se o código não existe,
  // a tela é a mesma da confirmação errada. Quem estiver testando códigos
  // no chute não descobre quais existem.
  if (!(await temAcesso(cod))) {
    return <FormularioConfirmacao codigo={cod} />;
  }

  const os = await buscarOsPublica(cod);
  if (!os) return <FormularioConfirmacao codigo={cod} />;

  const [itens, eventos, mensagens] = await Promise.all([
    buscarItens(os.id),
    buscarLinhaDoTempo(os.id),
    buscarMensagens(os.id),
  ]);

  const info = STATUS[os.status];
  const mostraOrcamento = os.valor_orcado != null && os.orcamento_enviado_em != null;
  const decidir = os.status === "orcamento_enviado";
  const falta = (os.valor_final ?? os.valor_orcado ?? 0) - os.valor_sinal;
  const diasGarantia = diasAte(os.garantia_ate);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="font-bold text-marca-700">{os.loja.nome}</p>
          <p className="text-xs text-slate-500">
            OS #{os.numero} · aberta em {data(os.criado_em)}
          </p>
        </div>
        <Link href="/os" className="text-xs text-slate-400 hover:text-marca-700">
          Outra OS
        </Link>
      </header>

      <section className="cartao p-6">
        <p className="text-sm text-slate-500">
          Olá, {os.cliente_nome}. Seu {os.aparelho}:
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
          {info.publico}
        </h1>
        <p className="mt-2 text-slate-600">{info.explicacao}</p>

        <div className="mt-6">
          <Trilha status={os.status} />
        </div>

        {os.prazo_estimado && os.status !== "entregue" && (
          <p className="mt-6 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700">
            {os.status === "pronto" ? (
              <>
                Pode buscar a partir de agora, no horário de funcionamento da loja.
              </>
            ) : (
              <>
                Previsão de entrega: <strong>{data(os.prazo_estimado)}</strong>
                {(() => {
                  const d = diasAte(os.prazo_estimado);
                  if (d === null) return null;
                  if (d < 0) return " — a loja está finalizando, e avisa por aqui.";
                  if (d === 0) return " — é hoje.";
                  if (d === 1) return " — é amanhã.";
                  return ` — daqui a ${d} dias.`;
                })()}
              </>
            )}
          </p>
        )}
      </section>

      {/* ---- o orçamento e a decisão do cliente ---- */}
      {mostraOrcamento && (
        <section
          className={`cartao mt-6 p-6 ${
            decidir ? "ring-2 ring-marca-500 ring-offset-2" : ""
          }`}
        >
          <h2 className="text-lg font-bold text-slate-900">
            {decidir ? "Orçamento para aprovação" : "Orçamento"}
          </h2>

          {os.diagnostico && (
            <div className="mt-3 rounded-lg bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                O que o técnico encontrou
              </p>
              <p className="mt-1 text-sm text-slate-700">{os.diagnostico}</p>
            </div>
          )}

          <table className="mt-4 w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {itens.map((i) => (
                <tr key={i.id}>
                  <td className="py-2 text-slate-700">
                    {i.descricao}
                    {i.quantidade > 1 && (
                      <span className="ml-1 text-slate-400">({i.quantidade}×)</span>
                    )}
                  </td>
                  <td className="py-2 text-right text-slate-900">
                    {moeda(i.quantidade * Number(i.valor_unitario))}
                  </td>
                </tr>
              ))}
              <tr className="text-base font-bold">
                <td className="py-3">Total</td>
                <td className="py-3 text-right">{moeda(os.valor_orcado)}</td>
              </tr>
            </tbody>
          </table>

          {decidir ? (
            <>
              <p className="mt-4 text-sm text-slate-600">
                O serviço só começa depois que você aprovar. Sua resposta fica registrada
                com data e hora.
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <form action={decidirOrcamento} className="flex-1">
                  <input type="hidden" name="codigo" value={cod} />
                  <input type="hidden" name="decisao" value="aprovar" />
                  <BotaoEnvio
                    className="btn-primario w-full py-3 text-base"
                    carregando="Aprovando..."
                  >
                    Aprovar {moeda(os.valor_orcado)}
                  </BotaoEnvio>
                </form>
                <form action={decidirOrcamento} className="sm:w-40">
                  <input type="hidden" name="codigo" value={cod} />
                  <input type="hidden" name="decisao" value="recusar" />
                  <BotaoEnvio
                    className="btn-secundario w-full py-3"
                    carregando="Registrando..."
                  >
                    Não quero
                  </BotaoEnvio>
                </form>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Ficou com dúvida? Pergunte à loja na conversa abaixo antes de decidir.
              </p>
            </>
          ) : (
            <>
              {os.aprovado_em && (
                <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  Você aprovou este orçamento em {dataHora(os.aprovado_em)}.
                </p>
              )}
              {os.recusado_em && !os.aprovado_em && (
                <p className="mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-800">
                  Você recusou este orçamento em {dataHora(os.recusado_em)}. O aparelho pode
                  ser retirado sem custo de serviço.
                </p>
              )}
              {os.aprovado_em && falta > 0 && (
                <p className="mt-2 text-sm text-slate-600">
                  {os.valor_sinal > 0
                    ? `Sinal pago de ${moeda(os.valor_sinal)}. Falta ${moeda(falta)} na retirada.`
                    : `A pagar na retirada: ${moeda(falta)}.`}
                </p>
              )}
              {os.pagamento === "pago" && (
                <p className="mt-2 text-sm text-emerald-700">Pagamento quitado.</p>
              )}
            </>
          )}
        </section>
      )}

      {diasGarantia !== null && diasGarantia > 0 && (
        <p className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Serviço na garantia até <strong>{data(os.garantia_ate)}</strong> — faltam{" "}
          {diasGarantia} dias. Deu problema no mesmo defeito? Fale com a loja por aqui.
        </p>
      )}

      {/* ---- conversa com a loja ---- */}
      <section className="cartao mt-6 p-6">
        <h2 className="text-lg font-bold text-slate-900">Falar com a loja</h2>
        <p className="mt-1 text-sm text-slate-500">
          Sem celular na mão, esta é a forma mais direta. A loja responde aqui mesmo.
        </p>

        <div className="mt-5 space-y-3">
          {mensagens.map((m) => (
            <div
              key={m.id}
              className={`rounded-lg px-4 py-3 text-sm ${
                m.autor === "cliente"
                  ? "ml-8 bg-marca-50 text-marca-900"
                  : "mr-8 bg-slate-100 text-slate-800"
              }`}
            >
              <p className="text-xs font-semibold opacity-60">
                {m.autor === "cliente" ? "Você" : os.loja.nome}
              </p>
              <p className="mt-1 whitespace-pre-wrap">{m.texto}</p>
              <p className="mt-1 text-xs opacity-50">{dataHora(m.criado_em)}</p>
            </div>
          ))}
        </div>

        <form action={mandarMensagem} className="mt-5 space-y-2">
          <input type="hidden" name="codigo" value={cod} />
          <textarea
            name="texto"
            rows={3}
            required
            maxLength={2000}
            className="campo"
            placeholder="Escreva sua dúvida para a loja..."
          />
          <BotaoEnvio className="btn-primario w-full py-2.5" carregando="Enviando...">
            Enviar mensagem
          </BotaoEnvio>
        </form>

        {os.loja.whatsapp && (
          <a
            href={linkWhatsapp(
              os.loja.whatsapp,
              `Olá! Sou ${os.cliente_nome}, da OS ${os.codigo} (${os.aparelho}).`,
            )}
            target="_blank"
            rel="noreferrer"
            className="btn-secundario mt-3 w-full"
          >
            Ou chamar no WhatsApp
          </a>
        )}
      </section>

      {/* ---- histórico ---- */}
      <section className="cartao mt-6 p-6">
        <h2 className="text-lg font-bold text-slate-900">Histórico</h2>
        <ol className="mt-4 space-y-4">
          {eventos.map((e) => (
            <li key={e.id} className="flex gap-3">
              <div className="mt-1.5 size-2 shrink-0 rounded-full bg-marca-500" />
              <div>
                <p className="font-medium text-slate-900">{e.titulo}</p>
                {e.descricao && <p className="text-sm text-slate-600">{e.descricao}</p>}
                <p className="mt-0.5 text-xs text-slate-400">{dataHora(e.criado_em)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <footer className="mt-8 rounded-xl bg-white p-6 text-sm text-slate-600 ring-1 ring-slate-200">
        <p className="font-semibold text-slate-900">{os.loja.nome}</p>
        {os.loja.endereco && <p className="mt-1">{os.loja.endereco}</p>}
        {os.loja.telefone && <p>{telefone(os.loja.telefone)}</p>}
        <p className="mt-3 text-xs text-slate-400">
          Garantia de {os.loja.garantia_dias} dias sobre o serviço executado, contados da
          entrega (CDC art. 26).
        </p>
      </footer>
    </main>
  );
}
