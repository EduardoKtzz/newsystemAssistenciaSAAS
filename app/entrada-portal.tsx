"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
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
 * Um campo para CPF ou código, e os 4 dígitos do telefone ao lado.
 *
 * Os dois campos ficam na mesma tela porque a confirmação em uma segunda
 * página só faz sentido quando a primeira revelou alguma coisa — e aqui
 * ela não revela: sem os dígitos, o servidor não responde nem se o código
 * existe. Juntar os dois tira uma tela do caminho de quem está com pressa
 * e não muda nada na segurança.
 */
export function EntradaPortal() {
  const [estado, acao] = useActionState(entrarNoPortal, {} as EstadoEntrada);

  return (
    <form action={acao} className="vidro p-6 sm:p-7">
      <div>
        <label htmlFor="identificador" className="rotulo-noite">
          CPF ou código do comprovante
        </label>
        <input
          id="identificador"
          name="identificador"
          required
          autoFocus
          autoComplete="off"
          autoCapitalize="characters"
          maxLength={18}
          className="campo-noite text-lg"
          placeholder="000.000.000-00  ou  A7K2M"
        />
      </div>

      <div className="mt-4">
        <label htmlFor="digitos" className="rotulo-noite">
          4 últimos dígitos do seu telefone
        </label>
        <input
          id="digitos"
          name="digitos"
          required
          inputMode="numeric"
          maxLength={4}
          pattern="[0-9]{4}"
          autoComplete="off"
          className="campo-noite w-40 text-center text-2xl font-bold tracking-[0.4em]"
          placeholder="0000"
        />
        <p className="mt-2 text-xs text-white/35">
          É a confirmação de que o conserto é seu. Nada de senha.
        </p>
      </div>

      {estado.erro && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
        >
          {estado.erro}
        </p>
      )}

      <div className="mt-6">
        <Botao />
      </div>
    </form>
  );
}
