import Link from "next/link";
import { cookies } from "next/headers";
import { exigirLoja } from "@/lib/sessao-loja";
import { TrocaTema } from "@/components/troca-tema";
import { sair } from "../entrar/actions";

/**
 * O painel é a casa da loja, não a nossa vitrine.
 *
 * Por isso o cabeçalho traz o nome da assistência, e não a marca do
 * sistema: quem está ali dentro sabe qual sistema está usando, e ver o
 * próprio nome ajuda quem opera duas lojas a saber em qual está.
 *
 * O tema vem do cookie aqui, e não na raiz do app, para as telas do
 * cliente continuarem estáticas e sempre escuras.
 */
export default async function LayoutPainel({ children }: LayoutProps<"/painel">) {
  const { loja, nome } = await exigirLoja();
  const tema = (await cookies()).get("tema")?.value === "escuro" ? "escuro" : "claro";

  return (
    <div data-tema={tema} className="flex min-h-screen flex-1 flex-col">
      <header className="border-b border-slate-200 escuro:border-white/10 bg-white escuro:bg-slate-900">
        <div className="mx-auto flex w-full max-w-[110rem] items-center gap-4 px-6 py-3">
          <Link
            href="/painel"
            className="truncate text-base font-bold text-slate-900 escuro:text-slate-100"
          >
            {loja.nome}
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <Link href="/painel/os/nova" className="btn-primario">
              Novo conserto
            </Link>
            <TrocaTema inicial={tema} />
            <form action={sair}>
              <button type="submit" className="btn-fantasma" title={nome}>
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[110rem] flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
