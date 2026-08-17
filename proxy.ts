import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { configSupabase } from "./lib/supabase/config";

/**
 * Renova a sessão do Supabase a cada navegação e barra o /painel de quem
 * não está logado.
 *
 * Server Components não conseguem gravar cookie, então sem esta camada o
 * token de acesso venceria e o usuário cairia para a tela de login no meio
 * do expediente. Aqui a renovação acontece na resposta, que pode gravar.
 *
 * O portal do cliente (/os/...) fica de fora de propósito: ele não usa
 * sessão do Supabase, e sim o cookie assinado de `lib/portal-sessao.ts`.
 */
export default async function proxy(request: NextRequest) {
  let resposta = NextResponse.next({ request });
  const { url: urlSupabase, chave } = configSupabase();

  const supabase = createServerClient(urlSupabase, chave, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesParaGravar) {
        for (const { name, value } of cookiesParaGravar) {
          request.cookies.set(name, value);
        }
        resposta = NextResponse.next({ request });
        for (const { name, value, options } of cookiesParaGravar) {
          resposta.cookies.set(name, value, options);
        }
      },
    },
  });

  // getUser() (e não getSession()) porque este valida o token no servidor
  // do Supabase. getSession() só lê o cookie, que é falsificável.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const rota = request.nextUrl.pathname;

  if (!user && rota.startsWith("/painel")) {
    const url = request.nextUrl.clone();
    url.pathname = "/entrar";
    url.searchParams.set("proximo", rota);
    return NextResponse.redirect(url);
  }

  if (user && rota === "/entrar") {
    const url = request.nextUrl.clone();
    url.pathname = "/painel";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return resposta;
}

export const config = {
  matcher: ["/painel/:path*", "/entrar"],
};
