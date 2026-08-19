"use client";

import Link from "next/link";

/**
 * A tela de falha das páginas do cliente.
 *
 * Sem este arquivo, uma queda do banco no wi-fi da loja vira "Application
 * error: a server-side exception has occurred" — em inglês e sem saída.
 *
 * O texto evita culpar a pessoa e evita jargão: quem está aqui só quer
 * saber do aparelho, e o telefone da loja resolve o problema dela agora,
 * independente do que aconteceu no servidor.
 */
export default function Erro({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="noite flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-6">
        <Link href="/" className="text-lg font-bold tracking-tight">
          Fix<span className="grad-texto">Cell</span>
        </Link>
      </header>

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 pb-16 text-center">
        <h1 className="text-4xl font-bold leading-tight tracking-tight">
          Algo falhou <span className="grad-texto">aqui</span>
        </h1>
        <p className="mt-4 leading-relaxed text-white/55">
          O problema é nosso, não seu. Tente de novo em alguns segundos — e se
          continuar assim, ligue para a loja: o seu conserto está registrado do mesmo
          jeito, nada se perdeu.
        </p>

        <div className="mt-8 space-y-3">
          <button type="button" onClick={reset} className="btn-brilho w-full">
            Tentar de novo
          </button>
          <Link href="/" className="btn-noite w-full py-3">
            Voltar ao início
          </Link>
        </div>
      </div>
    </main>
  );
}
