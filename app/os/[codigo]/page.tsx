import Link from "next/link";
import { STATUS } from "@/lib/status";
import {
  data,
  dataHora,
  diasAte,
  linkWhatsapp,
  moeda,
  telefone,
} from "@/lib/format";
import {
  buscarItens,
  buscarLinhaDoTempo,
  buscarMensagens,
  buscarOsPublica,
} from "@/lib/portal";
import { clientesLiberados, temAcesso } from "@/lib/portal-sessao";
import { Trilha } from "@/components/trilha";
import { BotaoEnvio } from "@/components/botao-envio";
import { FormularioConfirmacao } from "./confirmacao";
import { Desbloquear } from "./desbloquear";
import { decidirOrcamento, mandarMensagem } from "./actions";

export default async function Portal({ params }: PageProps<"/os/[codigo]">) {
  const { codigo } = await params;
  const cod = decodeURIComponent(codigo).toUpperCase();

  const os = await buscarOsPublica(cod);

  // Duas camadas de acesso, e a diferença é o que cada uma mostra.
  //
  //   completo — quem confirmou os 4 dígitos do telefone (pelo código do
  //              comprovante ou desbloqueando aqui dentro). Vê tudo.
  //   resumo   — quem entrou só com o CPF. Vê onde o aparelho está e para
  //              quando fica pronto, e nada além disso.
  //
  // A tela de confirmação é a mesma resposta para "código não existe" e
  // "sem acesso nenhum". Distinguir os dois entregaria de graça quais
  // códigos existem a quem estiver chutando.
  const completo = await temAcesso(cod);
  const cadastros = await clientesLiberados();
  const resumo = !!os && cadastros.includes(os.cliente_id);

  if (!os || (!completo && !resumo))
    return <FormularioConfirmacao codigo={cod} />;

  // Nada de buscar orçamento, conversa e histórico quando não vão ser
  // renderizados: no resumo eles não chegam nem a sair do banco.
  const [itens, eventos, mensagens] = completo
    ? await Promise.all([
        buscarItens(os.id),
        buscarLinhaDoTempo(os.id),
        buscarMensagens(os.id),
      ])
    : [[], [], []];

  const info = STATUS[os.status];
  const mostraOrcamento =
    completo && os.valor_orcado != null && os.orcamento_enviado_em != null;
  const decidir = completo && os.status === "orcamento_enviado";
  const falta = (os.valor_final ?? os.valor_orcado ?? 0) - os.valor_sinal;
  const diasGarantia = diasAte(os.garantia_ate);
  const outrasOs = cadastros.length > 0;

  return (
    <main className="noite flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-2xl items-center justify-between px-5 py-6">
        <Link href="/" className="text-base font-bold tracking-tight">
          Fix<span className="grad-texto">Cell</span>
        </Link>
        {outrasOs && (
          <Link href="/os/minhas" className="btn-noite">
            Meus consertos
          </Link>
        )}
      </header>

      <div className="mx-auto w-full max-w-2xl flex-1 px-5 pb-16">
        {/* ---- estado atual ---- */}
        <section className="vidro p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-white/45">
              Olá, {os.cliente_nome}. Seu {os.aparelho}:
            </p>
            <span className="text-xs text-white/25">
              {os.loja.nome} · OS #{os.numero}
            </span>
          </div>

          <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            <span className="grad-texto">{info.publico}</span>
          </h1>
          <p className="mt-3 leading-relaxed text-white/55">
            {info.explicacao}
          </p>

          <div className="mt-7">
            <Trilha status={os.status} escuro />
          </div>

          {os.prazo_estimado && os.status !== "entregue" && (
            <p className="mt-7 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white/65">
              {os.status === "pronto" ? (
                "Pode buscar a partir de agora, no horário de funcionamento da loja."
              ) : (
                <>
                  Previsão de entrega:{" "}
                  <strong className="text-white">
                    {data(os.prazo_estimado)}
                  </strong>
                  {(() => {
                    const d = diasAte(os.prazo_estimado);
                    if (d === null) return null;
                    if (d < 0)
                      return " — a loja está finalizando, e avisa por aqui.";
                    if (d === 0) return " — é hoje.";
                    if (d === 1) return " — é amanhã.";
                    return ` — daqui a ${d} dias.`;
                  })()}
                </>
              )}
            </p>
          )}
        </section>

        {/* ---- ponte do CPF para a OS completa ---- */}
        {!completo && <Desbloquear codigo={cod} />}

        {/* ---- orçamento e decisão ---- */}
        {mostraOrcamento && (
          <section
            className={`vidro mt-5 p-6 sm:p-8 ${
              decidir ? "border-marca-500/40 ring-1 ring-marca-500/25" : ""
            }`}
          >
            <h2 className="text-xl font-bold">
              {decidir ? "Orçamento para aprovação" : "Orçamento"}
            </h2>

            {os.diagnostico && (
              <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/35">
                  O que o técnico encontrou
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-white/70">
                  {os.diagnostico}
                </p>
              </div>
            )}

            <table className="mt-5 w-full text-sm">
              <tbody className="divide-y divide-white/6">
                {itens.map((i) => (
                  <tr key={i.id}>
                    <td className="py-2.5 text-white/65">
                      {i.descricao}
                      {i.quantidade > 1 && (
                        <span className="ml-1 text-white/30">
                          ({i.quantidade}×)
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 text-right text-white/85">
                      {moeda(i.quantidade * Number(i.valor_unitario))}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="pt-4 text-base font-bold">Total</td>
                  <td className="pt-4 text-right text-2xl font-bold">
                    <span className="grad-texto">{moeda(os.valor_orcado)}</span>
                  </td>
                </tr>
              </tbody>
            </table>

            {decidir ? (
              <>
                <p className="mt-5 text-sm leading-relaxed text-white/55">
                  O serviço só começa depois que você aprovar. Sua resposta fica
                  registrada com data e hora.
                </p>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <form action={decidirOrcamento} className="flex-1">
                    <input type="hidden" name="codigo" value={cod} />
                    <input type="hidden" name="decisao" value="aprovar" />
                    <BotaoEnvio
                      className="btn-brilho"
                      carregando="Aprovando..."
                    >
                      Aprovar {moeda(os.valor_orcado)}
                    </BotaoEnvio>
                  </form>
                  <form action={decidirOrcamento} className="sm:w-44">
                    <input type="hidden" name="codigo" value={cod} />
                    <input type="hidden" name="decisao" value="recusar" />
                    <BotaoEnvio
                      className="btn-noite w-full py-4"
                      carregando="Registrando..."
                    >
                      Não quero
                    </BotaoEnvio>
                  </form>
                </div>
                <p className="mt-4 text-xs text-white/35">
                  Ficou com dúvida? Pergunte à loja na conversa abaixo antes de
                  decidir.
                </p>
              </>
            ) : (
              <>
                {os.aprovado_em && (
                  <p className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
                    Você aprovou este orçamento em {dataHora(os.aprovado_em)}.
                  </p>
                )}
                {os.recusado_em && !os.aprovado_em && (
                  <p className="mt-5 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
                    Você recusou este orçamento em {dataHora(os.recusado_em)}. O
                    aparelho pode ser retirado sem custo de serviço.
                  </p>
                )}
                {os.aprovado_em && falta > 0 && (
                  <p className="mt-3 text-sm text-white/55">
                    {os.valor_sinal > 0
                      ? `Sinal pago de ${moeda(os.valor_sinal)}. Falta ${moeda(falta)} na retirada.`
                      : `A pagar na retirada: ${moeda(falta)}.`}
                  </p>
                )}
                {os.pagamento === "pago" && (
                  <p className="mt-3 text-sm text-emerald-300">
                    Pagamento quitado.
                  </p>
                )}
              </>
            )}
          </section>
        )}

        {diasGarantia !== null && diasGarantia > 0 && (
          <p className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.07] px-5 py-4 text-sm text-emerald-200">
            Serviço na garantia até <strong>{data(os.garantia_ate)}</strong> —
            faltam {diasGarantia} dias. Deu problema no mesmo defeito? Procure a
            loja.
          </p>
        )}

        {/* ---- conversa e histórico: só com o telefone confirmado ---- */}
        {completo && (
          <>
            <section className="vidro mt-5 p-6 sm:p-8">
              <h2 className="text-xl font-bold">Falar com a loja</h2>
              <p className="mt-1.5 text-sm text-white/50">
                Sem celular na mão, esta é a forma mais direta. A loja responde
                aqui mesmo.
              </p>

              <div className="mt-6 space-y-3">
                {mensagens.map((m) => (
                  <div
                    key={m.id}
                    className={`rounded-xl px-4 py-3 text-sm ${
                      m.autor === "cliente"
                        ? "ml-8 border border-marca-400/20 bg-marca-500/12 text-marca-50"
                        : "mr-8 border border-white/8 bg-white/[0.05] text-white/80"
                    }`}
                  >
                    <p className="text-[11px] font-semibold opacity-50">
                      {m.autor === "cliente" ? "Você" : os.loja.nome}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap leading-relaxed">
                      {m.texto}
                    </p>
                    <p className="mt-1.5 text-[11px] opacity-40">
                      {dataHora(m.criado_em)}
                    </p>
                  </div>
                ))}
              </div>

              <form action={mandarMensagem} className="mt-6 space-y-3">
                <input type="hidden" name="codigo" value={cod} />
                <textarea
                  name="texto"
                  rows={3}
                  required
                  maxLength={2000}
                  className="campo-noite resize-none"
                  placeholder="Escreva sua dúvida para a loja..."
                />
                <BotaoEnvio className="btn-brilho" carregando="Enviando...">
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
                  className="btn-noite mt-3 w-full py-3"
                >
                  Ou chamar no WhatsApp
                </a>
              )}
            </section>

            {/* ---- histórico ---- */}
            <section className="vidro mt-5 p-6 sm:p-8">
              <h2 className="text-xl font-bold">Histórico</h2>
              <ol className="mt-5 space-y-5">
                {eventos.map((e) => (
                  <li key={e.id} className="flex gap-4">
                    <div className="mt-1.5 size-2 shrink-0 rounded-full bg-marca-400 shadow-[0_0_10px_rgba(46,155,255,.7)]" />
                    <div>
                      <p className="font-medium text-white/90">{e.titulo}</p>
                      {e.descricao && (
                        <p className="text-sm leading-relaxed text-white/50">
                          {e.descricao}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-white/30">
                        {dataHora(e.criado_em)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </>
        )}

        <footer className="vidro mt-5 p-6 text-sm text-white/55">
          <p className="font-semibold text-white">{os.loja.nome}</p>
          {os.loja.endereco && <p className="mt-1">{os.loja.endereco}</p>}
          {os.loja.telefone && <p>{telefone(os.loja.telefone)}</p>}
          <p className="mt-3 text-xs text-white/30">
            Garantia de {os.loja.garantia_dias} dias sobre o serviço executado,
            contados da entrega (CDC art. 26).
          </p>
        </footer>
      </div>
    </main>
  );
}
