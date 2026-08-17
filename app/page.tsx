import Link from "next/link";
import { EntradaPortal } from "./entrada-portal";
import { PreviaPortal } from "@/components/previa-portal";

/**
 * A porta de entrada, escrita para o cliente e não para a loja.
 *
 * O título é a frase que a pessoa realmente pensa quando chega aqui. Ela
 * não veio "acessar o sistema de acompanhamento de ordens de serviço" —
 * ela quer saber do celular dela, que está na bancada de um estranho.
 *
 * A loja tem uma porta discreta no topo. É gente que entra todo dia e sabe
 * onde clicar; o cliente entra uma vez, muitas vezes do computador de
 * outra pessoa, e é dele que a tela precisa cuidar.
 */
export default function Home() {
  return (
    <main className="noite flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <span className="text-lg font-bold tracking-tight">
          Fix<span className="grad-texto">Cell</span>
        </span>
        <Link href="/entrar" className="btn-noite">
          Área da loja
        </Link>
      </header>

      <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-14 px-6 pb-16 pt-6 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:pt-0">
        <div className="max-w-xl">
          <span className="selo">
            <span className="size-1.5 rounded-full bg-marca-400" />
            Acompanhamento de conserto
          </span>

          <h1 className="mt-6 text-[2.7rem] font-bold leading-[1.05] tracking-tight sm:text-6xl">
            Onde está o
            <br />
            <span className="grad-texto">meu celular?</span>
          </h1>

          <p className="mt-5 text-lg leading-relaxed text-white/55">
            Veja o status do reparo, o prazo, o orçamento e fale com a loja. Sem criar
            conta, sem instalar nada — de qualquer aparelho, inclusive o emprestado.
          </p>

          <div className="mt-8">
            <EntradaPortal />
          </div>

          <div className="mt-7 flex flex-wrap gap-2">
            <span className="selo">Sem cadastro</span>
            <span className="selo">Aprove o orçamento online</span>
            <span className="selo">Converse com a loja</span>
          </div>
        </div>

        <div className="hidden lg:block">
          <PreviaPortal />
        </div>
      </div>

      <footer className="mx-auto w-full max-w-6xl px-6 pb-8 text-xs text-white/25">
        © 2026 FixCell · Feito para quem está sem o celular agora.
      </footer>
    </main>
  );
}
