import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente com a service_role key: ignora RLS por completo.
 *
 * Existe por um motivo só — o portal do cliente. O cliente não tem login
 * (é justamente quem está sem celular), então não há sessão para a RLS
 * avaliar. O acesso dele é conferido no servidor, por código público mais
 * os últimos dígitos do telefone, e só depois a consulta acontece.
 *
 * Regras que não podem ser afrouxadas:
 *  - `server-only` no topo faz o build QUEBRAR se este módulo for
 *    importado por um Client Component. É a trava, não um comentário.
 *  - toda função que use este cliente precisa filtrar por `os_id` /
 *    `codigo` na mão. Aqui não existe rede de segurança do banco.
 */
export function supabaseAdmin() {
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!chave) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY não configurada — o portal do cliente depende dela.",
    );
  }

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, chave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
