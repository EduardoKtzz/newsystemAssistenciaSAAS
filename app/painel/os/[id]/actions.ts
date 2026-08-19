"use server";

import { revalidatePath } from "next/cache";
import { exigirLoja } from "@/lib/sessao-loja";
import { supabaseServidor } from "@/lib/supabase/server";
import { STATUS, ehStatus, type OsStatus } from "@/lib/status";
import { somaItens } from "@/lib/types";
import { numeroBR } from "@/lib/format";

/**
 * Ações do painel sobre uma OS.
 *
 * Todas passam por `exigirLoja()` e usam o cliente com sessão, portanto a
 * RLS filtra por loja mesmo se um `eq("loja_id", ...)` faltar aqui. O
 * `.eq("id", osId)` sozinho já é seguro: se a OS for de outra loja, o
 * update alcança zero linha.
 */

async function registrarEvento(
  osId: string,
  lojaId: string,
  dados: {
    status?: OsStatus | null;
    titulo: string;
    descricao?: string | null;
    publico?: boolean;
  },
) {
  const supabase = await supabaseServidor();
  await supabase.from("os_evento").insert({
    os_id: osId,
    loja_id: lojaId,
    status: dados.status ?? null,
    titulo: dados.titulo,
    descricao: dados.descricao ?? null,
    autor: "loja",
    publico: dados.publico ?? true,
  });
}

function recarregar(osId: string) {
  revalidatePath(`/painel/os/${osId}`);
  revalidatePath("/painel");
}

export async function mudarStatus(dados: FormData) {
  const { loja } = await exigirLoja();
  const osId = String(dados.get("os_id"));
  const novo = String(dados.get("status"));
  const nota = String(dados.get("nota") ?? "").trim();

  if (!ehStatus(novo)) return;

  const supabase = await supabaseServidor();

  // Recusar levar a OS para trás no fluxo por engano é fácil no balcão, e
  // a timeline do cliente é pública — por isso só aceitamos transições que
  // `STATUS` declara. A regra de negócio mora em um lugar só.
  const { data: atual } = await supabase
    .from("os")
    .select("status")
    .eq("id", osId)
    .single();
  if (!atual) return;
  if (!STATUS[atual.status as OsStatus].proximos.includes(novo)) return;

  await supabase.from("os").update({ status: novo }).eq("id", osId);

  await registrarEvento(osId, loja.id, {
    status: novo,
    titulo: STATUS[novo].publico,
    descricao: nota || null,
  });

  recarregar(osId);
}

export async function salvarDiagnostico(dados: FormData) {
  const { loja } = await exigirLoja();
  const osId = String(dados.get("os_id"));
  const diagnostico = String(dados.get("diagnostico") ?? "").trim();
  const prazo = String(dados.get("prazo_estimado") ?? "").trim();

  const supabase = await supabaseServidor();
  await supabase
    .from("os")
    .update({ diagnostico: diagnostico || null, prazo_estimado: prazo || null })
    .eq("id", osId);

  // Evento interno: o cliente vê o diagnóstico junto com o orçamento, e
  // receber "diagnóstico atualizado" a cada correção de digitação só gera
  // ansiedade e ligação para a loja.
  await registrarEvento(osId, loja.id, {
    titulo: "Diagnóstico atualizado",
    descricao: diagnostico || null,
    publico: false,
  });

  recarregar(osId);
}

export async function adicionarItem(dados: FormData) {
  const { loja } = await exigirLoja();
  const osId = String(dados.get("os_id"));
  const descricao = String(dados.get("descricao") ?? "").trim();
  const tipo = String(dados.get("tipo") ?? "peca");
  const quantidade = Math.max(1, Number(dados.get("quantidade") ?? 1));
  const valor = numeroBR(String(dados.get("valor_unitario") ?? ""));

  if (!descricao || !Number.isFinite(valor) || valor < 0) return;

  const supabase = await supabaseServidor();
  await supabase.from("os_item").insert({
    os_id: osId,
    loja_id: loja.id,
    descricao,
    tipo: tipo === "servico" ? "servico" : "peca",
    quantidade,
    valor_unitario: valor,
  });

  recarregar(osId);
}

export async function removerItem(dados: FormData) {
  await exigirLoja();
  const osId = String(dados.get("os_id"));
  const itemId = String(dados.get("item_id"));

  const supabase = await supabaseServidor();
  await supabase.from("os_item").delete().eq("id", itemId);

  recarregar(osId);
}

/**
 * Fecha o orçamento e devolve a bola para o cliente.
 *
 * `valor_orcado` é congelado aqui, somando os itens do momento. Não é
 * calculado na leitura de propósito: o cliente aprova um número, e esse
 * número não pode mudar depois porque alguém editou uma linha de peça.
 */
export async function enviarOrcamento(dados: FormData) {
  const { loja } = await exigirLoja();
  const osId = String(dados.get("os_id"));

  const supabase = await supabaseServidor();

  const { data: itens } = await supabase
    .from("os_item")
    .select("quantidade, valor_unitario")
    .eq("os_id", osId);

  if (!itens?.length) return;
  const total = somaItens(itens);

  await supabase
    .from("os")
    .update({
      valor_orcado: total,
      status: "orcamento_enviado",
      orcamento_enviado_em: new Date().toISOString(),
      // Reenvio depois de recusa: limpa o carimbo antigo para a OS não
      // ficar com data de recusa e status de orçamento aberto ao mesmo tempo.
      recusado_em: null,
    })
    .eq("id", osId);

  await registrarEvento(osId, loja.id, {
    status: "orcamento_enviado",
    titulo: "Orçamento disponível",
    descricao: "O serviço aguarda sua aprovação para começar.",
  });

  recarregar(osId);
}

export async function registrarPagamento(dados: FormData) {
  const { loja } = await exigirLoja();
  const osId = String(dados.get("os_id"));
  const pagamento = String(dados.get("pagamento"));
  const sinal = numeroBR(String(dados.get("valor_sinal") ?? ""));
  const valorFinal = String(dados.get("valor_final") ?? "").trim();

  if (!["pendente", "sinal", "pago"].includes(pagamento)) return;

  const supabase = await supabaseServidor();
  await supabase
    .from("os")
    .update({
      pagamento,
      valor_sinal: Number.isFinite(sinal) ? sinal : 0,
      valor_final: valorFinal && Number.isFinite(numeroBR(valorFinal)) ? numeroBR(valorFinal) : null,
    })
    .eq("id", osId);

  await registrarEvento(osId, loja.id, {
    titulo: "Pagamento atualizado",
    publico: false,
  });

  recarregar(osId);
}

/**
 * Devolve ao zero o contador de tentativas do portal.
 *
 * Depois de oito palpites errados a OS trava, e `conferirAcesso` responde
 * "bloqueada" antes de conferir os dígitos — o reset que existe lá dentro
 * só roda quando o cliente acerta, e acertar virou impossível. Sem esta
 * ação, um cliente que digitou os 4 dígitos de um telefone antigo trancava
 * a própria OS e a loja só destravava rodando SQL no Supabase.
 *
 * Fica registrado no histórico interno porque é a loja abrindo a porta
 * para alguém: se a trava existe para conter quem está adivinhando, quem
 * a removeu precisa aparecer.
 */
export async function liberarAcessoDoCliente(dados: FormData) {
  const { loja } = await exigirLoja();
  const osId = String(dados.get("os_id"));

  const supabase = await supabaseServidor();
  await supabase.from("os").update({ tentativas_portal: 0 }).eq("id", osId);

  await registrarEvento(osId, loja.id, {
    titulo: "Acesso do cliente liberado",
    descricao: "As tentativas de confirmação pelo portal foram zeradas pela loja.",
    publico: false,
  });

  recarregar(osId);
}

export async function responderCliente(dados: FormData) {
  const { loja } = await exigirLoja();
  const osId = String(dados.get("os_id"));
  const texto = String(dados.get("texto") ?? "").trim();
  if (!texto) return;

  const supabase = await supabaseServidor();
  await supabase.from("mensagem").insert({
    os_id: osId,
    loja_id: loja.id,
    autor: "loja",
    texto,
    lida: true,
  });

  recarregar(osId);
}

export async function marcarLidas(osId: string) {
  await exigirLoja();
  const supabase = await supabaseServidor();
  await supabase
    .from("mensagem")
    .update({ lida: true })
    .eq("os_id", osId)
    .eq("autor", "cliente")
    .eq("lida", false);
}
