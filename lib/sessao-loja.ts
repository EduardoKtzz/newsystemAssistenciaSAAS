import "server-only";
import { redirect } from "next/navigation";
import { supabaseServidor } from "./supabase/server";
import type { Loja } from "./types";

/**
 * Usuário logado + loja dele. Toda página do painel começa por aqui.
 *
 * Redireciona em vez de devolver `null` porque nenhuma tela do painel tem
 * o que mostrar sem loja — deixar cada uma decidir seria repetir o mesmo
 * `if` em todo arquivo, com o risco de esquecer em um deles.
 */
export async function exigirLoja(): Promise<{
  userId: string;
  email: string;
  nome: string;
  papel: string;
  loja: Loja;
}> {
  const supabase = await supabaseServidor();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: vinculo } = await supabase
    .from("loja_usuario")
    .select("nome, papel, loja:loja_id(*)")
    .eq("user_id", user.id)
    .single();

  // Usuário autenticado mas sem loja: cadastro pela metade. Manda concluir
  // em vez de estourar erro numa tela em branco.
  if (!vinculo?.loja) redirect("/comecar");

  return {
    userId: user.id,
    email: user.email ?? "",
    nome: vinculo.nome ?? user.email ?? "",
    papel: vinculo.papel,
    loja: vinculo.loja as unknown as Loja,
  };
}
