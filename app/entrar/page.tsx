import Link from "next/link";
import { FormularioEntrada } from "./formulario";

export default async function Entrar({ searchParams }: PageProps<"/entrar">) {
  const { proximo } = await searchParams;

  return (
    <main className="noite flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-md items-center justify-between px-6 py-6">
        <Link href="/" className="text-base font-bold tracking-tight">
          Fix<span className="grad-texto">Cell</span>
        </Link>
        <span className="text-xs uppercase tracking-[0.16em] text-white/30">
          Área da loja
        </span>
      </header>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 pb-20">
        <FormularioEntrada proximo={typeof proximo === "string" ? proximo : "/painel"} />
      </div>

      <p className="mx-auto w-full max-w-md px-6 pb-10 text-center text-sm text-white/35">
        É cliente e quer acompanhar um conserto?{" "}
        <Link href="/" className="font-semibold text-marca-300 hover:underline">
          Consultar aqui
        </Link>
      </p>
    </main>
  );
}
