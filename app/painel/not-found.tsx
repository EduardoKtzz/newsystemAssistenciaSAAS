import Link from "next/link";

/**
 * O 404 de dentro do painel.
 *
 * Separado do 404 do cliente por causa da pele: aqui é a tela clara em que
 * o atendente passa o dia, e cair numa página escura no meio do expediente
 * parece falha do sistema.
 *
 * O caso comum não é link errado: é OS que o colega cancelou ou que mudou
 * de loja. Por isso a saída é a lista, e não a home.
 */
export default function NaoEncontrado() {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <h1 className="text-2xl font-bold txt-forte">Essa ordem de serviço não está aqui</h1>
      <p className="mt-3 text-sm txt-medio">
        Ou o endereço está errado, ou a OS foi apagada. Se você chegou por um link
        antigo, procure pelo número da OS ou pelo nome do cliente na lista.
      </p>
      <Link href="/painel" className="btn-primario mt-6 inline-flex">
        Voltar para a lista
      </Link>
    </div>
  );
}
