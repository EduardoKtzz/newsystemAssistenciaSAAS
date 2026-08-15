"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServidor } from "@/lib/supabase/server";

export type EstadoForm = { erro?: string; aviso?: string };

/**
 * O Supabase devolve mensagens em inglês e genéricas de propósito
 * ("Invalid login credentials" não diz se o e-mail existe, o que é correto).
 * Traduzimos sem revelar mais do que ele revelou.
 */
function traduzir(msg: string): string {
  if (msg.includes("Invalid login credentials")) return "E-mail ou senha incorretos.";
  if (msg.includes("Email not confirmed"))
    return "Confirme seu e-mail antes de entrar. Verifique a caixa de entrada.";
  if (msg.includes("already registered")) return "Esse e-mail já tem cadastro. Faça login.";
  if (msg.includes("Password should be"))
    return "A senha precisa ter pelo menos 6 caracteres.";
  if (msg.includes("rate limit") || msg.includes("Too many"))
    return "Muitas tentativas. Espere alguns minutos e tente de novo.";
  return "Não foi possível continuar. Tente novamente.";
}

export async function entrar(
  _anterior: EstadoForm,
  dados: FormData,
): Promise<EstadoForm> {
  const email = String(dados.get("email") ?? "").trim();
  const senha = String(dados.get("senha") ?? "");
  const proximo = String(dados.get("proximo") ?? "/painel");

  if (!email || !senha) return { erro: "Preencha e-mail e senha." };

  const supabase = await supabaseServidor();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) return { erro: traduzir(error.message) };

  revalidatePath("/", "layout");
  // Só aceitamos caminho interno: "proximo" vem da URL e um valor como
  // "https://site-falso" viraria redirect aberto para fora do sistema.
  redirect(proximo.startsWith("/") ? proximo : "/painel");
}

export async function criarConta(
  _anterior: EstadoForm,
  dados: FormData,
): Promise<EstadoForm> {
  const email = String(dados.get("email") ?? "").trim();
  const senha = String(dados.get("senha") ?? "");

  if (senha.length < 6) return { erro: "A senha precisa ter pelo menos 6 caracteres." };

  const supabase = await supabaseServidor();
  const { data, error } = await supabase.auth.signUp({ email, password: senha });
  if (error) return { erro: traduzir(error.message) };

  // Com confirmação de e-mail ligada no Supabase, o cadastro nasce sem
  // sessão: não dá para seguir para o painel ainda.
  if (!data.session) {
    return {
      aviso: "Cadastro criado. Confirme o e-mail que enviamos e depois faça login.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/comecar");
}

export async function sair() {
  const supabase = await supabaseServidor();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/entrar");
}
