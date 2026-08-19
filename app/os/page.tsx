import Link from "next/link";
import { redirect } from "next/navigation";

/**
 * Entrada pelo código impresso no comprovante.
 *
 * Vive fora da home porque a home é do CPF, que é o caminho de quem já
 * perdeu o papel — a maioria depois de duas semanas. Mas o código segue
 * valendo: está impresso em comprovante que já saiu da loja, e papel no
 * bolso do cliente não recebe atualização.
 *
 * Ao contrário do CPF, o código leva à confirmação dos 4 dígitos e abre o
 * acesso completo à OS.
 */
export default function EntradaPorCodigo() {
  async function ir(dados: FormData) {
    "use server";
    const codigo = String(dados.get("codigo") ?? "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
    if (codigo) redirect(`/os/${codigo}`);
  }

  return (
    <main className="noite flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-6">
        <Link href="/" className="text-lg font-bold tracking-tight">
          Fix<span className="grad-texto">Cell</span>
        </Link>
      </header>

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 pb-16 text-center">
        <h1 className="text-4xl font-bold leading-tight tracking-tight">
          Entrar pelo <span className="grad-texto">código</span>
        </h1>
        <p className="mt-4 leading-relaxed text-white/55">
          O código de 5 caracteres está no comprovante que a loja te entregou. Por ele
          você vê também o orçamento e pode aprovar o serviço.
        </p>

        <form action={ir} className="vidro mt-8 p-6 text-left sm:p-8">
          <label htmlFor="codigo" className="rotulo-noite">
            Código da ordem de serviço
          </label>
          <input
            id="codigo"
            name="codigo"
            required
            autoFocus
            autoComplete="off"
            autoCapitalize="characters"
            maxLength={8}
            className="campo-noite codigo-os text-center text-3xl font-bold uppercase"
            placeholder="A7K2M"
          />
          <button type="submit" className="btn-brilho mt-5">
            Continuar
          </button>
        </form>

        <p className="mt-6 text-sm text-white/35">
          Perdeu o comprovante?{" "}
          <Link href="/" className="font-semibold text-marca-300 hover:underline">
            Consulte pelo CPF
          </Link>
        </p>
      </div>
    </main>
  );
}
