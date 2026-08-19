import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirLoja } from "@/lib/sessao-loja";
import { supabaseServidor } from "@/lib/supabase/server";
import { STATUS, type OsStatus } from "@/lib/status";
import {
  data,
  dataHora,
  desde,
  diasAte,
  diasDesde,
  linkWhatsapp,
  moeda,
  telefone,
} from "@/lib/format";
import {
  somaItens,
  type Mensagem,
  type OsCompleta,
  type OsEvento,
  type OsItem,
} from "@/lib/types";
import { EtiquetaStatus } from "@/components/etiqueta-status";
import { BotaoEnvio } from "@/components/botao-envio";
import { Copiar } from "@/components/copiar";
import { Modal } from "@/components/modal";
import { Trilha } from "@/components/trilha";
import { IconeConversa, IconeRelogio, IconeWhatsapp } from "@/components/icones";
import { LIMITE_TENTATIVAS } from "@/lib/portal";
import {
  adicionarItem,
  enviarOrcamento,
  liberarAcessoDoCliente,
  marcarLidas,
  mudarStatus,
  registrarPagamento,
  removerItem,
  responderCliente,
  salvarDiagnostico,
} from "./actions";

/**
 * A tela de trabalho de uma OS.
 *
 * O desenho segue uma pergunta: o que o atendente precisa ver com o
 * cliente na frente dele? Identidade, situação e o próximo passo — tudo
 * no cabeçalho, sem rolar.
 *
 * O resto é trabalho de bancada e desce em três blocos na ordem em que
 * acontece: ficha, diagnóstico, orçamento. O que é consulta eventual
 * (acesso do cliente, histórico, acerto de pagamento) mora em janela: usar
 * uma vez por semana não justifica ocupar a tela todo dia.
 */
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
  const naoLidas = (mensagens ?? []).filter((m) => m.autor === "cliente" && !m.lida).length;

  const base = process.env.NEXT_PUBLIC_URL_BASE ?? "";
  const linkPortal = `${base}/os/${os.codigo}`;

  const avisoWhatsapp = linkWhatsapp(
    os.cliente.telefone,
    `Olá ${os.cliente.nome.split(" ")[0]}! Aqui é da ${loja.nome}. ` +
      `Novidade sobre o seu ${os.aparelho.marca} ${os.aparelho.modelo}: ${STATUS[os.status].publico}. ` +
      `Acompanhe em ${linkPortal} (código ${os.codigo}).`,
  );

  // O primeiro é o caminho feliz e vem pré-selecionado na janela; os
  // outros são desvio (cancelar, voltar).
  const proximos = STATUS[os.status].proximos;

  const diasEsperando =
    os.status === "orcamento_enviado" ? diasDesde(os.orcamento_enviado_em) : null;
  const atraso = diasAte(os.prazo_estimado);

  return (
    <>
      <Link href="/painel" className="text-sm txt-medio hover:text-marca-700 escuro:hover:text-marca-300">
        ← Voltar para a lista
      </Link>

      {novo && (
        <div className="mt-4 rounded-xl border border-emerald-200 escuro:border-emerald-400/25 bg-emerald-50 escuro:bg-emerald-500/10 p-5">
          <p className="font-semibold text-emerald-900 escuro:text-emerald-100">OS aberta.</p>
          <p className="mt-1 text-sm text-emerald-800 escuro:text-emerald-200">
            Peça ao cliente para anotar o código{" "}
            <strong className="codigo-os">{os.codigo}</strong>, ou imprima a notinha para
            ele acompanhar todo o conserto pelo site.
          </p>
        </div>
      )}

      {/* ================= cabeçalho ================= */}
      <header className="cartao mt-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight txt-forte">OS #{os.numero}</h1>
              <EtiquetaStatus status={os.status} />
            </div>
            <p className="mt-2 text-lg font-medium txt-forte">{os.cliente.nome}</p>
            <p className="text-sm txt-medio">
              {os.aparelho.marca} {os.aparelho.modelo}
              {os.aparelho.cor ? ` ${os.aparelho.cor}` : ""} · na bancada {desde(os.criado_em)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Os dois canais de contato, lado a lado e só ícone: o de
                dentro (portal) e o de fora (WhatsApp). */}
            <Modal
              rotulo={
                <>
                  <IconeConversa />
                  {naoLidas > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-marca-600 px-1 text-[11px] font-bold text-white ring-2 ring-[var(--sup)]">
                      {naoLidas > 9 ? "9+" : naoLidas}
                    </span>
                  )}
                </>
              }
              classeBotao="btn-secundario relative size-10 p-0"
              titulo="Conversa com o cliente"
              descricao="O cliente escreve pelo portal, mesmo sem o celular na mão."
              largura="max-w-xl"
              aoAbrir={marcarLidas.bind(null, os.id)}
            >
              <Conversa os={os} mensagens={(mensagens ?? []) as Mensagem[]} />
            </Modal>

            <a
              href={avisoWhatsapp}
              target="_blank"
              rel="noreferrer"
              title="Avisar no WhatsApp"
              aria-label="Avisar no WhatsApp"
              className="inline-flex size-10 items-center justify-center rounded-lg bg-[#25D366] text-white transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366]"
            >
              <IconeWhatsapp />
            </a>

            <span className="mx-1 h-6 w-px" style={{ background: "var(--borda)" }} />

            <Modal
              rotulo="Acesso do cliente"
              titulo="Acesso do cliente"
              descricao="Como esta pessoa acompanha o conserto pelo site."
            >
              <AcessoCliente os={os} link={linkPortal} />
            </Modal>

            <Modal rotulo="Histórico" titulo={`Histórico da OS #${os.numero}`} largura="max-w-xl">
              <Historico eventos={(eventos ?? []) as OsEvento[]} />
            </Modal>

            {proximos.length > 0 && (
              <Modal
                rotulo="Mudar status"
                titulo="Mudar status"
                descricao={`A OS está em "${STATUS[os.status].label}". Escolha o próximo passo.`}
                classeBotao="btn-primario"
              >
                <MoverStatus osId={os.id} opcoes={proximos} />
              </Modal>
            )}
          </div>
        </div>

        <div className="mt-7">
          <Trilha status={os.status} />
        </div>
      </header>

      {/* ================= avisos ================= */}
      {diasEsperando !== null && (
        <p className="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 escuro:bg-amber-500/10 px-4 py-3 text-sm text-amber-800 escuro:text-amber-200">
          <IconeRelogio />
          {diasEsperando === 0
            ? "Orçamento enviado hoje. A bancada só recomeça quando o cliente aprovar."
            : `Aguardando resposta do cliente há ${diasEsperando} ${diasEsperando === 1 ? "dia" : "dias"}. Vale um toque no WhatsApp.`}
        </p>
      )}
      {atraso !== null && atraso < 0 && os.status !== "entregue" && os.status !== "pronto" && (
        <p className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 escuro:bg-rose-500/10 px-4 py-3 text-sm text-rose-800 escuro:text-rose-200">
          <IconeRelogio />
          Passou {Math.abs(atraso)} {Math.abs(atraso) === 1 ? "dia" : "dias"} da previsão de
          entrega. O cliente vê essa data no portal.
        </p>
      )}

      {/* ================= corpo ================= */}
      <div className="mt-5 grid items-start gap-5 xl:grid-cols-2">
        <div className="space-y-5">
          <Ficha os={os} />

          <section className="cartao p-6">
            <h2 className="titulo-bloco">Diagnóstico técnico</h2>
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
              <p className="text-xs txt-fraco">
                O cliente lê o diagnóstico junto com o orçamento, não a cada salvamento.
              </p>
            </form>
          </section>

        </div>

        <Orcamento os={os} itens={listaItens} total={totalItens} />
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */

function Ficha({ os }: { os: OsCompleta }) {
  return (
    <section className="cartao p-6">
      <h2 className="titulo-bloco">O que o cliente relatou</h2>
      <p className="mt-2 text-lg leading-relaxed txt-forte">{os.defeito_relatado}</p>

      <dl className="mt-6 grid gap-x-6 gap-y-4 sm:grid-cols-3">
        <Dado termo="Telefone" valor={telefone(os.cliente.telefone)} />
        <Dado termo="IMEI" valor={os.aparelho.imei ?? "não informado"} />
        <Dado termo="Acessórios" valor={os.acessorios ?? "nenhum"} />
        {os.garantia_ate && (
          <Dado termo="Garantia até" valor={data(os.garantia_ate)} />
        )}
      </dl>

      {os.senha_aparelho && (
        <div className="mt-5 flex items-center gap-3 rounded-lg bg-amber-50 escuro:bg-amber-500/10 px-4 py-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 escuro:text-amber-300">
            Senha
          </span>
          <span className="font-mono text-lg text-amber-900 escuro:text-amber-100">
            {os.senha_aparelho}
          </span>
          <span className="ml-auto text-xs text-amber-700/70 escuro:text-amber-300/60">
            uso interno — nunca vai ao portal
          </span>
        </div>
      )}
    </section>
  );
}

function Dado({ termo, valor }: { termo: string; valor: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wider txt-fraco">{termo}</dt>
      <dd className="mt-0.5 txt-forte">{valor}</dd>
    </div>
  );
}

function AcessoCliente({ os, link }: { os: OsCompleta; link: string }) {
  return (
    <>
      <p className="codigo-os text-center text-4xl font-bold txt-forte">{os.codigo}</p>
      <p className="mt-3 text-center text-sm txt-medio">
        No site, o cliente entra com o <strong className="txt-forte">CPF</strong>
        {os.cliente.documento ? "" : " (ainda não cadastrado)"} ou com este código, e
        confirma com os 4 últimos dígitos do telefone —{" "}
        <strong className="txt-forte">{telefone(os.cliente.telefone).slice(-4)}</strong>.
      </p>

      {!os.cliente.documento && (
        <p className="mt-4 rounded-lg bg-amber-50 escuro:bg-amber-500/10 px-3 py-2 text-xs text-amber-800 escuro:text-amber-200">
          Sem CPF no cadastro, este cliente depende do papel do comprovante. Vale pedir o
          CPF na entrega.
        </p>
      )}

      {os.tentativas_portal > 0 && (
        <div
          className={
            os.tentativas_portal >= LIMITE_TENTATIVAS
              ? "mt-4 rounded-lg bg-rose-50 escuro:bg-rose-500/10 px-3 py-3 text-xs text-rose-800 escuro:text-rose-200"
              : "mt-4 rounded-lg bg-amber-50 escuro:bg-amber-500/10 px-3 py-3 text-xs text-amber-800 escuro:text-amber-200"
          }
        >
          {os.tentativas_portal >= LIMITE_TENTATIVAS ? (
            <p>
              <strong>O acesso está travado.</strong> Foram {os.tentativas_portal} tentativas
              erradas de confirmar o telefone, e o cliente não consegue mais entrar. Se você
              falou com ele e é quem diz ser, libere aqui.
            </p>
          ) : (
            <p>
              {os.tentativas_portal}{" "}
              {os.tentativas_portal === 1 ? "tentativa errada" : "tentativas erradas"} de
              confirmar o telefone. Em {LIMITE_TENTATIVAS} o acesso trava. Costuma ser
              telefone antigo no cadastro.
            </p>
          )}
          <form action={liberarAcessoDoCliente}>
            <input type="hidden" name="os_id" value={os.id} />
            <BotaoEnvio className="btn-secundario mt-3 w-full" carregando="Liberando...">
              Liberar acesso do cliente
            </BotaoEnvio>
          </form>
        </div>
      )}

      <div className="mt-6 space-y-2">
        <Copiar texto={link} className="btn-secundario w-full">
          Copiar link do portal
        </Copiar>
        <Link
          href={`/comprovante/${os.id}`}
          target="_blank"
          className="btn-secundario w-full"
        >
          Imprimir comprovante
        </Link>
      </div>

      <p className="mt-4 break-all text-center text-xs txt-fraco">{link}</p>
    </>
  );
}

/**
 * O seletor de status.
 *
 * Um formulário só, com escolha por rádio, em vez de uma fileira de
 * botões que disparam sozinhos. A diferença importa porque mover status é
 * ação com efeito para fora: cada mudança vira evento no portal e pode
 * gerar aviso ao cliente. Escolher e depois confirmar dá o instante de
 * arrependimento que um botão solto não dá.
 *
 * Cada opção mostra o que o CLIENTE vai ler, e não só o rótulo interno —
 * é a informação que decide entre "Aguardando peça" e "Em reparo" quando
 * a pessoa está em dúvida.
 *
 * A lista vem de `lib/status.ts`: a tela não inventa transição, e o
 * servidor recusa qualquer passo que não esteja lá.
 */
function MoverStatus({ osId, opcoes }: { osId: string; opcoes: OsStatus[] }) {
  return (
    <form action={mudarStatus} className="space-y-4">
      <input type="hidden" name="os_id" value={osId} />

      <div className="space-y-2">
        {opcoes.map((s, i) => (
          <label
            key={s}
            className="flex cursor-pointer gap-3 rounded-xl border p-3 transition has-[:checked]:border-marca-500 has-[:checked]:bg-marca-50 escuro:has-[:checked]:bg-marca-500/10"
            style={{ borderColor: "var(--borda)" }}
          >
            <input
              type="radio"
              name="status"
              value={s}
              defaultChecked={i === 0}
              className="mt-1 size-4 shrink-0 accent-marca-700"
            />
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-semibold txt-forte">{STATUS[s].label}</span>
                {i === 0 && (
                  <span className="etiqueta bg-marca-50 escuro:bg-marca-500/15 text-marca-700 escuro:text-marca-200 ring-marca-200 escuro:ring-marca-400/30">
                    próximo passo
                  </span>
                )}
              </span>
              <span className="mt-0.5 block text-sm txt-medio">
                {STATUS[s].explicacao}
              </span>
            </span>
          </label>
        ))}
      </div>

      <div>
        <label htmlFor="nota" className="rotulo">
          Observação para o cliente{" "}
          <span className="font-normal txt-fraco">(opcional)</span>
        </label>
        <textarea
          id="nota"
          name="nota"
          rows={2}
          className="campo"
          placeholder="A peça chegou hoje, o reparo começa amanhã cedo."
        />
        <p className="mt-1 text-xs txt-fraco">
          Entra no histórico que o cliente vê, junto com a mudança.
        </p>
      </div>

      <BotaoEnvio className="btn-primario w-full" carregando="Movendo..." fechaModal>
        Confirmar mudança
      </BotaoEnvio>
    </form>
  );
}

function Historico({ eventos }: { eventos: OsEvento[] }) {
  if (!eventos.length) {
    return <p className="text-sm txt-medio">Nada registrado ainda.</p>;
  }
  return (
    <ol className="space-y-4">
      {eventos.map((e) => (
        <li key={e.id} className="flex gap-3">
          <div
            className={`mt-1.5 size-2 shrink-0 rounded-full ${
              e.publico ? "bg-marca-500" : "bg-slate-300 escuro:bg-white/20"
            }`}
          />
          <div className="min-w-0">
            <p className="font-medium txt-forte">
              {e.titulo}
              {!e.publico && <span className="ml-2 text-xs font-normal txt-fraco">interno</span>}
              {e.autor === "cliente" && (
                <span className="ml-2 text-xs font-normal text-emerald-600 escuro:text-emerald-300">
                  pelo cliente
                </span>
              )}
            </p>
            {e.descricao && <p className="text-sm txt-medio">{e.descricao}</p>}
            <p className="mt-0.5 text-xs txt-fraco">{dataHora(e.criado_em)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/**
 * A conversa, agora dentro de uma janela.
 *
 * Antes ocupava uma coluna inteira o dia todo para, na maioria das OS,
 * mostrar "nenhuma mensagem". Como ícone com contador, ela só chama
 * atenção quando tem algo — e o resto da tela ganha o espaço.
 *
 * As mensagens só são marcadas como lidas quando a janela abre, e não no
 * carregamento da página: o contador tem que sobreviver a um F5 de quem
 * ainda não leu nada.
 */
function Conversa({ os, mensagens }: { os: OsCompleta; mensagens: Mensagem[] }) {
  return (
    <div className="flex max-h-[60vh] flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto">
        {mensagens.length === 0 && (
          <p className="text-sm txt-fraco">
            Nenhuma mensagem ainda. O cliente pode escrever pelo portal mesmo sem o
            celular — e a resposta aparece lá na hora.
          </p>
        )}
        {mensagens.map((m) => (
          <div
            key={m.id}
            className={`rounded-xl px-4 py-3 text-sm ${
              m.autor === "loja"
                ? "ml-10 bg-marca-50 escuro:bg-marca-500/12 text-marca-900 escuro:text-marca-100"
                : "mr-10 bg-slate-100 escuro:bg-white/8 txt-forte"
            }`}
          >
            <p className="text-[11px] font-semibold opacity-60">
              {m.autor === "loja" ? "Você" : os.cliente.nome.split(" ")[0]}
            </p>
            <p className="mt-1 whitespace-pre-wrap leading-relaxed">{m.texto}</p>
            <p className="mt-1 text-[11px] opacity-50">{dataHora(m.criado_em)}</p>
          </div>
        ))}
      </div>

      <form action={responderCliente} className="mt-4 space-y-2 border-t pt-4" style={{ borderColor: "var(--borda)" }}>
        <input type="hidden" name="os_id" value={os.id} />
        <textarea
          name="texto"
          rows={3}
          required
          className="campo resize-none"
          placeholder="Responder ao cliente..."
        />
        <BotaoEnvio className="btn-primario w-full" carregando="Enviando...">
          Enviar resposta
        </BotaoEnvio>
      </form>
    </div>
  );
}

/**
 * O orçamento, e com ele o dinheiro da OS.
 *
 * O acerto de pagamento é o mesmo assunto e por isso vive aqui — mas
 * dentro de uma janela, porque acontece uma vez por OS e não merece um
 * formulário aberto na tela o tempo todo.
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
  const fechado = !!os.aprovado_em;
  const falta = (os.valor_final ?? os.valor_orcado ?? 0) - os.valor_sinal;

  return (
    <section className="cartao p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="titulo-bloco">Orçamento</h2>
        {os.aprovado_em && (
          <span className="etiqueta bg-emerald-100 escuro:bg-emerald-500/15 text-emerald-800 escuro:text-emerald-200 ring-emerald-200 escuro:ring-emerald-400/30">
            Aprovado pelo cliente em {dataHora(os.aprovado_em)}
          </span>
        )}
        {os.recusado_em && !os.aprovado_em && (
          <span className="etiqueta bg-rose-100 escuro:bg-rose-500/15 text-rose-800 escuro:text-rose-200 ring-rose-200 escuro:ring-rose-400/30">
            Recusado em {dataHora(os.recusado_em)}
          </span>
        )}
      </div>

      {itens.length > 0 ? (
        <table className="mt-4 w-full text-sm">
          <tbody className="divide-y divide-slate-100 escuro:divide-white/8">
            {itens.map((i) => (
              <tr key={i.id}>
                <td className="py-2.5">
                  <span className="txt-forte">{i.descricao}</span>
                  <span className="ml-2 text-xs txt-fraco">
                    {i.tipo === "peca" ? "peça" : "serviço"}
                  </span>
                </td>
                <td className="py-2.5 text-right txt-medio">{i.quantidade}×</td>
                <td className="py-2.5 text-right font-medium txt-forte">
                  {moeda(i.quantidade * Number(i.valor_unitario))}
                </td>
                <td className="w-8 py-2.5 text-right">
                  {!fechado && (
                    <form action={removerItem}>
                      <input type="hidden" name="os_id" value={os.id} />
                      <input type="hidden" name="item_id" value={i.id} />
                      <button
                        type="submit"
                        className="txt-fraco transition hover:text-rose-600 escuro:hover:text-rose-300"
                        aria-label={`Remover ${i.descricao}`}
                      >
                        ×
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            <tr>
              <td className="pt-3 font-semibold txt-forte">Total</td>
              <td />
              <td className="pt-3 text-right text-xl font-bold txt-forte">{moeda(total)}</td>
              <td />
            </tr>
          </tbody>
        </table>
      ) : (
        <p className="mt-3 text-sm txt-medio">
          Nenhuma peça ou serviço lançado. O cliente só vê o orçamento depois que você
          enviar.
        </p>
      )}

      {!fechado && (
        <form action={adicionarItem} className="mt-5 flex flex-wrap items-end gap-2 rebaixo py-3">
          <input type="hidden" name="os_id" value={os.id} />
          <div className="min-w-44 flex-1">
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
      )}

      {/* ---- linha do dinheiro ---- */}
      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-slate-100 escuro:border-white/8 pt-5">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider txt-fraco">
            Situação
          </p>
          <p className="font-medium txt-forte">
            {os.pagamento === "pago"
              ? "Pago"
              : os.pagamento === "sinal"
                ? `Sinal de ${moeda(os.valor_sinal)}`
                : "Em aberto"}
          </p>
        </div>
        {os.valor_orcado != null && falta > 0 && (
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider txt-fraco">
              Falta receber
            </p>
            <p className="font-medium txt-forte">{moeda(falta)}</p>
          </div>
        )}

        <div className="ml-auto flex flex-wrap gap-2">
          <Modal
            rotulo="Registrar pagamento"
            titulo="Pagamento"
            descricao="O cliente vê o que falta pagar no portal."
          >
            <Pagamento os={os} />
          </Modal>

          {itens.length > 0 && !fechado && (
            <form action={enviarOrcamento}>
              <input type="hidden" name="os_id" value={os.id} />
              <BotaoEnvio carregando="Enviando...">
                {os.orcamento_enviado_em
                  ? `Reenviar ${moeda(total)}`
                  : `Enviar ${moeda(total)} ao cliente`}
              </BotaoEnvio>
            </form>
          )}
        </div>
      </div>

      {fechado && (
        <p className="mt-4 rounded-lg bg-emerald-50 escuro:bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 escuro:text-emerald-200">
          Serviço autorizado por {moeda(os.valor_orcado)}. A aprovação está registrada no
          histórico com data e hora — é o que vale numa discussão sobre serviço não
          autorizado.
        </p>
      )}
      {!fechado && itens.length > 0 && !os.orcamento_enviado_em && (
        <p className="mt-3 text-xs txt-fraco">
          O valor é congelado no envio: editar peças depois não muda o que o cliente
          aprovou.
        </p>
      )}
    </section>
  );
}

function Pagamento({ os }: { os: OsCompleta }) {
  return (
    <form action={registrarPagamento} className="space-y-4">
      <input type="hidden" name="os_id" value={os.id} />
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="pagamento" className="rotulo">
            Situação
          </label>
          <select id="pagamento" name="pagamento" defaultValue={os.pagamento} className="campo">
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
            className="campo"
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
            className="campo"
          />
        </div>
      </div>
      <p className="text-xs txt-fraco">
        O valor final só difere do orçado quando algo mudou na execução. Em branco, vale o
        orçado ({moeda(os.valor_orcado)}).
      </p>
      <BotaoEnvio className="btn-primario w-full" fechaModal>
        Salvar
      </BotaoEnvio>
    </form>
  );
}
