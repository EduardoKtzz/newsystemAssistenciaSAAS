"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigirLoja } from "@/lib/sessao-loja";
import { supabaseServidor } from "@/lib/supabase/server";
import { soDigitos } from "@/lib/format";

export type EstadoForm = { erro?: string };

/**
 * Abre uma OS a partir do balcão.
 *
 * Cliente e aparelho são reaproveitados quando já existem — o telefone
 * identifica a pessoa, o IMEI identifica o aparelho. É isso que faz a
 * segunda visita do mesmo cliente cair no mesmo histórico em vez de criar
 * um cadastro paralelo, e é o que sustenta a pergunta "esse aparelho já
 * passou aqui?".
 */
export async function abrirOs(
  _anterior: EstadoForm,
  dados: FormData,
): Promise<EstadoForm> {
  const { loja } = await exigirLoja();
  const supabase = await supabaseServidor();

  const nome = String(dados.get("cliente_nome") ?? "").trim();
  const fone = soDigitos(String(dados.get("cliente_telefone") ?? ""));
  const email = String(dados.get("cliente_email") ?? "").trim();
  const marca = String(dados.get("marca") ?? "").trim();
  const modelo = String(dados.get("modelo") ?? "").trim();
  const cor = String(dados.get("cor") ?? "").trim();
  const imei = soDigitos(String(dados.get("imei") ?? ""));
  const defeito = String(dados.get("defeito_relatado") ?? "").trim();
  const senha = String(dados.get("senha_aparelho") ?? "").trim();
  const acessorios = String(dados.get("acessorios") ?? "").trim();
  const prazo = String(dados.get("prazo_estimado") ?? "").trim();

  if (nome.length < 2) return { erro: "Informe o nome do cliente." };
  // 10 dígitos = fixo com DDD. Menos que isso não dá para avisar ninguém, e
  // a confirmação do portal usa os 4 últimos deste número.
  if (fone.length < 10) return { erro: "Informe o telefone do cliente com DDD." };
  if (!marca || !modelo) return { erro: "Informe marca e modelo do aparelho." };
  if (defeito.length < 3) return { erro: "Descreva o problema relatado." };

  // Cliente: procura pelo telefone dentro da loja.
  let clienteId: string;
  const { data: achado } = await supabase
    .from("cliente")
    .select("id")
    .eq("telefone", fone)
    .maybeSingle();

  if (achado) {
    clienteId = achado.id;
  } else {
    const { data, error } = await supabase
      .from("cliente")
      .insert({ loja_id: loja.id, nome, telefone: fone, email: email || null })
      .select("id")
      .single();
    if (error || !data) return { erro: "Não foi possível salvar o cliente." };
    clienteId = data.id;
  }

  // Aparelho: o IMEI é o identificador de verdade. Sem ele, cada entrada
  // vira um aparelho novo — chutar por marca+modelo juntaria dois iPhone 12
  // diferentes do mesmo dono num cadastro só.
  let aparelhoId: string | null = null;
  if (imei) {
    const { data } = await supabase
      .from("aparelho")
      .select("id")
      .eq("imei", imei)
      .maybeSingle();
    aparelhoId = data?.id ?? null;
  }

  if (!aparelhoId) {
    const { data, error } = await supabase
      .from("aparelho")
      .insert({
        loja_id: loja.id,
        cliente_id: clienteId,
        marca,
        modelo,
        cor: cor || null,
        imei: imei || null,
      })
      .select("id")
      .single();
    if (error || !data) return { erro: "Não foi possível salvar o aparelho." };
    aparelhoId = data.id;
  }

  const { data: os, error: erroOs } = await supabase
    .from("os")
    .insert({
      loja_id: loja.id,
      cliente_id: clienteId,
      aparelho_id: aparelhoId,
      defeito_relatado: defeito,
      senha_aparelho: senha || null,
      acessorios: acessorios || null,
      prazo_estimado: prazo || null,
      status: "recebido",
    })
    .select("id")
    .single();

  if (erroOs || !os) return { erro: "Não foi possível abrir a OS." };

  await supabase.from("os_evento").insert({
    os_id: os.id,
    loja_id: loja.id,
    status: "recebido",
    titulo: "Aparelho recebido",
    descricao: defeito,
    autor: "loja",
  });

  revalidatePath("/painel");
  redirect(`/painel/os/${os.id}?novo=1`);
}
