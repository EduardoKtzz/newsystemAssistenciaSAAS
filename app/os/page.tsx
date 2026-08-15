import Link from "next/link";
import { redirect } from "next/navigation";

/**
 * A porta do cliente.
 *
 * Um campo só. Quem chega aqui geralmente está sem o próprio celular, no
 * computador de outra pessoa, com um papel na mão — qualquer passo a mais
 * é um motivo a mais para desistir e ligar para a loja, que é exatamente
 * o telefonema que o sistema existe para evitar.
 */
export default function EntradaPortal() {
  async function ir(dados: FormData) {
    "use server";
    const codigo = String(dados.get("codigo") ?? "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
    if (codigo) redirect(`/os/${codigo}`);
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <Link href="/" className="mb-8 text-center text-xl font-bold text-marca-700">
        FixCell
      </Link>

      <div className="cartao p-8">
        <h1 className="text-xl font-bold text-slate-900">Acompanhar meu conserto</h1>
        <p className="mt-2 text-sm text-slate-600">
          Digite o código que está no comprovante que a loja te entregou.
        </p>

        <form action={ir} className="mt-6 space-y-4">
          <div>
            <label htmlFor="codigo" className="rotulo">
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
              className="campo codigo-os text-center text-2xl font-bold uppercase"
              placeholder="A7K2M"
            />
          </div>
          <button type="submit" className="btn-primario w-full py-3 text-base">
            Consultar
          </button>
        </form>

        <p className="mt-6 border-t border-slate-100 pt-4 text-xs text-slate-500">
          Perdeu o comprovante? Ligue para a loja e peça o código da sua OS. Ele tem 5
          caracteres, entre letras e números.
        </p>
      </div>
    </main>
  );
}
