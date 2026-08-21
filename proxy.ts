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

  // getUser(), e não getSession() nem getClaims().
  //
  // getSession() está fora de questão: ele só lê o cookie e acredita nele, e
  // esse cookie é forjável.
  //
  // getClaims() esteve aqui por um tempo, porque com chave assimétrica ele
  // confere a assinatura localmente e economiza ~670ms por navegação. Foi
  // revertido, e o motivo merece ficar escrito para ninguém "otimizar" isto
  // de novo:
  //
  //   getClaims() responde "este token é autêntico e não venceu".
  //   getUser()   responde "esta sessão ainda existe no servidor".
  //
  // São perguntas diferentes, e é a segunda que importa depois que alguém
  // aperta Sair, troca a senha, bane ou apaga uma conta. Nenhuma dessas
  // ações mexe no token que já está no navegador: ele continua assinado e
  // dentro da validade. Com verificação só local, quem tivesse copiado o
  // cookie seguia entrando no painel até o token vencer sozinho — até uma
  // hora depois de a loja achar que tinha cortado o acesso. A RLS não salva:
  // o token é válido, então auth.uid() devolve o usuário legítimo e as
  // policies liberam tudo.
  //
  // O preço é uma ida à rede por navegação. Numa assistência técnica, em que
  // o computador do balcão é compartilhado e gente entra e sai da equipe,
  // esse preço é barato. O caminho certo para acelerar é aproximar o banco,
  // não deixar de perguntar.
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
