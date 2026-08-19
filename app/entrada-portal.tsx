"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CampoCpf } from "@/components/campos-mascarados";
import { entrarNoPortal, type EstadoEntrada } from "./acoes-portal";

function Botao() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-brilho">
      {pending ? "Procurando..." : "Ver meu conserto"}
    </button>
  );
}

/**
 * Um campo só: o CPF.
 *
 * Quem chega aqui está sem o próprio celular, no computador de outra
 * pessoa, querendo saber se já pode buscar o aparelho. Cada campo a mais
 * nesta tela é um motivo a mais para desistir e ligar para a loja — que é
 * exatamente o telefonema que o sistema existe para evitar.
 */
export function EntradaPortal() {
  const [estado, acao] = useActionState(entrarNoPortal, {} as EstadoEntrada);

  return (
    <form action={acao} className="vidro p-6 text-left sm:p-8">
      <label htmlFor="cpf" className="rotulo-noite">
        Seu CPF
      </label>
      <CampoCpf
        id="cpf"
        name="cpf"
        required
        autoFocus
        className="campo-noite text-center text-2xl font-semibold tracking-wider"
        classeAviso="text-rose-300"
        placeholder="000.000.000-00"
      />

      {estado.erro && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
        >
          {estado.erro}
        </p>
      )}

      <div className="mt-5">
        <Botao />
      </div>

      <p className="mt-4 text-center text-xs text-white/30">
        Tem o comprovante em mãos?{" "}
        <Link href="/os" className="text-white/50 underline-offset-2 hover:underline">
          Entrar pelo código
        </Link>
      </p>
    </form>
  );
}
