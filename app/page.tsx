import Link from "next/link";
import { EntradaPortal } from "./entrada-portal";

/**
 * A porta de entrada, escrita para o cliente e não para a loja.
 *
 * O título é a frase que a pessoa realmente pensa quando chega aqui. Ela
 * não veio "acessar o sistema de acompanhamento de ordens de serviço" —
 * ela quer saber do celular dela, que está na bancada de um estranho.
 *
 * Uma coluna só, centralizada. A tela tem uma tarefa: achar o conserto.
 * Qualquer coisa ao lado do formulário divide o olho de quem chegou com
 * pressa, e ilustração não ajuda quem já sabe o que veio fazer.
 *
 * A loja tem uma porta discreta no topo. É gente que entra todo dia e sabe
 * onde clicar; o cliente entra uma vez, muitas vezes do computador de
 * outra pessoa, e é dele que a tela precisa cuidar.
 */
export default function Home() {
  return (
    <main className="noite flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <span className="text-lg font-bold tracking-tight">
          Fix<span className="grad-texto">Cell</span>
        </span>
        <Link href="/entrar" className="btn-noite">
          Área da loja
        </Link>
      </header>

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 pb-10 text-center">
        <span className="selo mx-auto">
          <span className="size-1.5 rounded-full bg-marca-400" />
          Acompanhamento de conserto
        </span>

        <h1 className="mt-7 text-[2.9rem] font-bold leading-[1.04] tracking-tight sm:text-[4rem]">
          Onde está o
          <br />
          <span className="grad-texto">meu celular?</span>
        </h1>

        <p className="mx-auto mt-6 max-w-lg text-lg leading-relaxed text-white/55">
          Digite seu CPF e veja em que pé está o reparo e para quando fica pronto. Sem
          criar conta, sem instalar nada — de qualquer aparelho, inclusive o emprestado.
        </p>

        <div className="mt-10">
          <EntradaPortal />
        </div>

        <div className="mt-7 flex flex-wrap justify-center gap-2">
          <span className="selo">Sem cadastro</span>
          <span className="selo">Sem senha</span>
          <span className="selo">Funciona em qualquer aparelho</span>
        </div>
      </div>

      <footer className="mx-auto w-full max-w-5xl px-6 pb-8 text-center text-xs text-white/25">
        © 2026 FixCell · Feito para quem está sem o celular agora.
      </footer>
    </main>
  );
}
