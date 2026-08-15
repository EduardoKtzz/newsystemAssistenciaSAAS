import Link from "next/link";
import { exigirLoja } from "@/lib/sessao-loja";
import { sair } from "../entrar/actions";

export default async function LayoutPainel({ children }: LayoutProps<"/painel">) {
  const { loja, nome } = await exigirLoja();

  return (
    <>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-3">
          <Link href="/painel" className="font-bold text-marca-700">
            FixCell
          </Link>
          <span className="hidden text-sm text-slate-400 sm:inline">/</span>
          <span className="hidden truncate text-sm font-medium text-slate-700 sm:inline">
            {loja.nome}
          </span>

          <div className="ml-auto flex items-center gap-2">
            <Link href="/painel/os/nova" className="btn-primario">
              Nova OS
            </Link>
            <form action={sair}>
              <button type="submit" className="btn-fantasma" title={nome}>
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
    </>
  );
}
