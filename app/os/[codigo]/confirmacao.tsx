"use client";

import Link from "next/link";
import { useActionState } from "react";
import { BotaoEnvio } from "@/components/botao-envio";
import { confirmar, type EstadoForm } from "./actions";

/**
 * A única barreira entre um código e os dados do cliente.
 *
 * Pedimos os 4 últimos dígitos do telefone porque é a informação que o dono
 * do aparelho sabe de cor, mesmo sem o aparelho na mão — que é a situação
 * exata em que ele chega aqui. Senha, e-mail ou CPF falhariam justamente
 * nesse cenário.
 */
export function FormularioConfirmacao({ codigo }: { codigo: string }) {
  const [estado, acao] = useActionState(confirmar, {} as EstadoForm);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <Link href="/" className="mb-8 text-center text-xl font-bold text-marca-700">
        FixCell
      </Link>

      <div className="cartao p-8">
        <h1 className="text-xl font-bold text-slate-900">Confirme que é você</h1>
        <p className="mt-2 text-sm text-slate-600">
          Consultando a OS <strong className="codigo-os">{codigo}</strong>. Para proteger
          seus dados, digite os <strong>4 últimos dígitos</strong> do telefone que você
          passou para a loja.
        </p>

        <form action={acao} className="mt-6 space-y-4">
          <input type="hidden" name="codigo" value={codigo} />
          <div>
            <label htmlFor="digitos" className="rotulo">
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
              className="campo text-center text-2xl font-bold tracking-[0.4em]"
              placeholder="0000"
            />
          </div>

          {estado.erro && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {estado.erro}
            </p>
          )}

          <BotaoEnvio className="btn-primario w-full py-3 text-base" carregando="Conferindo...">
            Ver meu conserto
          </BotaoEnvio>
        </form>

        <p className="mt-6 border-t border-slate-100 pt-4 text-xs text-slate-500">
          Não lembra qual telefone deixou? Ligue para a loja — eles confirmam na hora.
        </p>
      </div>
    </main>
  );
}
