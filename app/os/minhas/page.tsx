import Link from "next/link";
import { redirect } from "next/navigation";
import { buscarOsDosClientes } from "@/lib/portal";
import { clientesLiberados } from "@/lib/portal-sessao";
import { EtiquetaStatus } from "@/components/etiqueta-status";
import { data, moeda } from "@/lib/format";

/**
 * A lista de quem entrou por CPF e tem mais de um conserto.
 *
 * Aparece quando a pessoa deixou dois aparelhos, ou quando foi atendida em
 * mais de uma loja — o cadastro de cliente é por loja, então o mesmo CPF
 * pode ter vários. Por isso cada cartão diz de qual assistência é: sem
 * isso, duas OS com status parecido viram a mesma coisa aos olhos de quem
 * só quer saber qual celular já pode buscar.
 */
export default async function MinhasOs() {
  const ids = await clientesLiberados();
  if (!ids.length) redirect("/");

  const lista = await buscarOsDosClientes(ids);
  if (!lista.length) redirect("/");

  return (
    <main className="noite flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-6">
        <Link href="/" className="text-lg font-bold tracking-tight">
          Fix<span className="grad-texto">Cell</span>
        </Link>
      </header>

      <div className="mx-auto w-full max-w-3xl flex-1 px-6 pb-16">
        <h1 className="text-3xl font-bold tracking-tight">Seus consertos</h1>
        <p className="mt-2 text-white/50">
          {lista.length} ordens de serviço no seu CPF. Toque em uma para ver os detalhes.
        </p>

        <ul className="mt-8 space-y-3">
          {lista.map((os) => (
            <li key={os.codigo}>
              <Link
                href={`/os/${os.codigo}`}
                className="vidro flex flex-wrap items-center gap-x-5 gap-y-3 p-5 transition hover:border-white/25 hover:bg-white/[0.06]"
              >
                <div className="min-w-44 flex-1">
                  <p className="text-lg font-semibold text-white">{os.aparelho}</p>
                  <p className="text-sm text-white/45">
                    {os.loja} · OS #{os.numero} · desde {data(os.criado_em)}
                  </p>
                </div>

                <EtiquetaStatus status={os.status} publico escuro />

                <div className="text-right">
                  <p className="font-semibold text-white">
                    {os.valor != null ? moeda(os.valor) : "—"}
                  </p>
                  <p className="codigo-os text-xs text-white/30">{os.codigo}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
