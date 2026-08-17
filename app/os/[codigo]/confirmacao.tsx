"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { confirmar, type EstadoForm } from "./actions";

function Botao() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-brilho">
      {pending ? "Conferindo..." : "Ver meu conserto"}
    </button>
  );
}

/**
 * A confirmação de quem chegou direto pelo link do comprovante.
 *
 * Pedimos os 4 últimos dígitos do telefone porque é o que o dono do
 * aparelho sabe de cor mesmo sem o aparelho na mão — que é a situação
 * exata em que ele chega aqui. Senha, e-mail ou código de SMS falhariam
 * justamente nesse cenário.
 */
export function FormularioConfirmacao({ codigo }: { codigo: string }) {
  const [estado, acao] = useActionState(confirmar, {} as EstadoForm);

  return (
    <main className="noite flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-md items-center justify-between px-6 py-6">
        <Link href="/" className="text-base font-bold tracking-tight">
          Fix<span className="grad-texto">Cell</span>
        </Link>
      </header>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 pb-20">
        <h1 className="text-3xl font-bold tracking-tight">
          Confirme que <span className="grad-texto">é você</span>
        </h1>
        <p className="mt-3 leading-relaxed text-white/55">
          Consultando a OS <strong className="codigo-os text-white">{codigo}</strong>. Para
          proteger seus dados, digite os <strong className="text-white">4 últimos
          dígitos</strong> do telefone que você passou para a loja.
        </p>

        <form action={acao} className="vidro mt-7 p-6">
          <input type="hidden" name="codigo" value={codigo} />
          <label htmlFor="digitos" className="rotulo-noite">
            4 últimos dígitos do seu telefone
          </label>
          <input
            id="digitos"
            name="digitos"
            required
            autoFocus
            inputMode="numeric"
            maxLength={4}
            pattern="[0-9]{4}"
            autoComplete="off"
            className="campo-noite text-center text-3xl font-bold tracking-[0.45em]"
            placeholder="0000"
          />

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

        <p className="mt-6 text-center text-sm text-white/35">
          Não lembra o telefone?{" "}
          <Link href="/" className="font-semibold text-marca-300 hover:underline">
            Entre pelo seu CPF
          </Link>
        </p>
      </div>
    </main>
  );
}
