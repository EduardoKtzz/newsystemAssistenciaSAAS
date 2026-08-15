import Link from "next/link";

/**
 * A porta de entrada tem duas fechaduras muito diferentes.
 *
 * A loja entra todo dia e sabe onde clicar. O cliente entra uma vez, do PC
 * de um parente, nervoso porque o celular dele está na bancada de outra
 * pessoa. Por isso o caminho do cliente vem primeiro e maior: quem já usa
 * o sistema acha o link pequeno; quem nunca usou, não.
 */
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-16">
      <div className="mb-10 text-center">
        <p className="text-2xl font-bold tracking-tight text-marca-700">FixCell</p>
        <p className="mt-1 text-sm text-slate-500">Assistência técnica de celular</p>
      </div>

      <div className="cartao p-8">
        <h1 className="text-xl font-bold text-slate-900">
          Acompanhe o conserto do seu aparelho
        </h1>
        <p className="mt-2 text-slate-600">
          Digite o código que está no comprovante que a loja te entregou. Você vê o
          status, o prazo, o orçamento e pode falar com a loja por aqui — não precisa
          criar conta nem instalar nada.
        </p>
        <Link href="/os" className="btn-primario mt-6 w-full py-3 text-base">
          Consultar meu conserto
        </Link>
      </div>

      <div className="mt-8 text-center text-sm text-slate-500">
        É uma assistência técnica?{" "}
        <Link href="/entrar" className="font-semibold text-marca-700 hover:underline">
          Entrar no painel
        </Link>
      </div>
    </main>
  );
}
