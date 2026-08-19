import Link from "next/link";

/**
 * O 404 das telas do cliente.
 *
 * Existe porque o padrão do Next é uma página em inglês, sem cabeçalho e
 * sem saída — e ela aparece justamente para quem digitou o código errado
 * do comprovante, que é o momento em que a pessoa está mais insegura sobre
 * ter entregado o aparelho para gente séria.
 *
 * Por isso o texto não diz "página não encontrada": diz o que fazer.
 */
export default function NaoEncontrado() {
  return (
    <main className="noite flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-6">
        <Link href="/" className="text-lg font-bold tracking-tight">
          Fix<span className="grad-texto">Cell</span>
        </Link>
      </header>

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 pb-16 text-center">
        <h1 className="text-4xl font-bold leading-tight tracking-tight">
          Esse endereço não <span className="grad-texto">existe</span>
        </h1>
        <p className="mt-4 leading-relaxed text-white/55">
          Pode ser um link antigo, ou um caractere trocado no código do comprovante. O
          código tem 5 caracteres e não usa as letras O, I, L e U — se alguma delas
          apareceu na sua leitura, provavelmente é um zero, um 1 ou um V.
        </p>

        <div className="mt-8 space-y-3">
          <Link href="/" className="btn-brilho w-full">
            Buscar pelo meu CPF
          </Link>
          <Link href="/os" className="btn-noite w-full py-3">
            Entrar pelo código do comprovante
          </Link>
        </div>
      </div>
    </main>
  );
}
