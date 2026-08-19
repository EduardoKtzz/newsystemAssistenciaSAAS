"use client";

import Link from "next/link";

/**
 * A tela de falha do painel.
 *
 * O caso real não é bug: é o wi-fi da loja oscilando no meio de um
 * cadastro. Por isso "tentar de novo" vem primeiro e vem sozinho — quase
 * sempre é o que resolve.
 *
 * A garantia sobre os dados está escrita porque é a primeira pergunta de
 * quem estava digitando quando a tela caiu.
 */
export default function Erro({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <h1 className="text-2xl font-bold txt-forte">Não foi possível carregar</h1>
      <p className="mt-3 text-sm txt-medio">
        Costuma ser a conexão caindo por um instante. Tente de novo — o que já estava
        salvo continua salvo.
      </p>
      <div className="mt-6 flex flex-col gap-2">
        <button type="button" onClick={reset} className="btn-primario">
          Tentar de novo
        </button>
        <Link href="/painel" className="btn-secundario">
          Voltar para a lista
        </Link>
      </div>
    </div>
  );
}
