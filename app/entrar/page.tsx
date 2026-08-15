import Link from "next/link";
import { FormularioEntrada } from "./formulario";

export default async function Entrar({ searchParams }: PageProps<"/entrar">) {
  const { proximo } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <Link href="/" className="mb-8 text-center text-xl font-bold text-marca-700">
        FixCell
      </Link>

      <div className="cartao p-8">
        <FormularioEntrada proximo={typeof proximo === "string" ? proximo : "/painel"} />
      </div>

      <p className="mt-6 text-center text-sm text-slate-500">
        É cliente e quer acompanhar um conserto?{" "}
        <Link href="/os" className="font-semibold text-marca-700 hover:underline">
          Consultar por código
        </Link>
      </p>
    </main>
  );
}
