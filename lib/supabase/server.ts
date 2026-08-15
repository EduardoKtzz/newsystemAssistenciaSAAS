import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente do Supabase para Server Components e Server Actions.
 *
 * Usa a chave pública e carrega a sessão do usuário a partir dos cookies,
 * o que significa que TODA consulta feita por aqui passa pela RLS. É o
 * caminho normal do painel da loja: mesmo que um `where loja_id` seja
 * esquecido numa query, o banco não devolve linha de outra loja.
 */
export async function supabaseServidor() {
  const jar = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return jar.getAll();
        },
        setAll(cookiesParaGravar) {
          try {
            for (const { name, value, options } of cookiesParaGravar) {
              jar.set(name, value, options);
            }
          } catch {
            // Server Component não pode gravar cookie. Quem renova a sessão
            // é o middleware; aqui o silêncio é o comportamento correto.
          }
        },
      },
    },
  );
}
