"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServidor } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { soDigitos } from "@/lib/format";

export type EstadoForm = { erro?: string; valores?: Record<string, string> };

/**
 * Cria a loja e liga o usuário logado a ela.
 *
 * Passa pelo cliente admin porque `loja` e `loja_usuario` não têm policy de
 * INSERT: entrar numa loja é ato administrativo, não operação de usuário.
 * Se houvesse policy, um usuário poderia se auto-vincular a QUALQUER loja
 * existente e ler as OS dela — a raiz do isolamento cairia por terra.
 *
 * A checagem de vínculo anterior é o que impede o mesmo usuário de abrir
 * lojas em série e a checagem de sessão é o que impede um anônimo de chamar
 * a ação direto.
 */
export async function criarLoja(
  _anterior: EstadoForm,
  dados: FormData,
): Promise<EstadoForm> {
  const supabase = await supabaseServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  // O React 19 dá reset no formulário quando a ação responde. Sem devolver
  // os valores, um telefone incompleto apaga o cadastro inteiro da loja.
  const valores = Object.fromEntries(
    [...dados.entries()].filter(([, v]) => typeof v === "string"),
  ) as Record<string, string>;
  const falha = (erro: string): EstadoForm => ({ erro, valores });

  const nome = String(dados.get("nome") ?? "").trim();
  const telefone = soDigitos(String(dados.get("telefone") ?? ""));
  const endereco = String(dados.get("endereco") ?? "").trim();
  const garantia = Number(dados.get("garantia_dias") ?? 90);
  const seuNome = String(dados.get("seu_nome") ?? "").trim();

  if (nome.length < 2) return falha("Informe o nome da loja.");
  if (telefone.length < 10) return falha("Informe um telefone com DDD.");
  if (!Number.isFinite(garantia) || garantia < 90) {
    return falha("A garantia não pode ser menor que 90 dias (CDC art. 26).");
  }

  const admin = supabaseAdmin();

  const { data: jaTem } = await admin
    .from("loja_usuario")
    .select("loja_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (jaTem) redirect("/painel");

  const { data: loja, error: erroLoja } = await admin
    .from("loja")
    .insert({
      nome,
      telefone,
      whatsapp: telefone,
      endereco: endereco || null,
      garantia_dias: garantia,
    })
    .select("id")
    .single();

  if (erroLoja || !loja) return falha("Não foi possível criar a loja. Tente de novo.");

  const { error: erroVinculo } = await admin.from("loja_usuario").insert({
    user_id: user.id,
    loja_id: loja.id,
    nome: seuNome || user.email,
    papel: "dono",
  });

  if (erroVinculo) {
    // Loja órfã sem vínculo deixaria o usuário travado no /comecar para
    // sempre, então desfazemos antes de devolver o erro.
    await admin.from("loja").delete().eq("id", loja.id);
    return falha("Não foi possível concluir o cadastro. Tente de novo.");
  }

  revalidatePath("/", "layout");
  redirect("/painel");
}
