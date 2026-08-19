"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { confirmar, type EstadoForm } from "./actions";

function Botao() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-brilho sm:w-auto sm:px-8">
      {pending ? "Conferindo..." : "Liberar"}
    </button>
  );
}

/**
 * A ponte entre a camada de status e a OS completa.
 *
 * Aparece para quem entrou pelo CPF. O CPF diz onde o aparelho está; os 4
 * últimos dígitos do telefone abrem o resto — valor, diagnóstico, conversa
 * e o botão de aprovar o serviço.
 *
 * A separação existe por causa da aprovação, principalmente. O carimbo de
 * "aprovado em tal dia, tal hora" é o que a loja mostra numa discussão
 * sobre serviço não autorizado. Se qualquer um que saiba um CPF pudesse
 * clicar em aprovar, esse carimbo não provaria nada — e a loja teria
 * comprado um sistema que enfraquece a defesa dela em vez de reforçar.
 */
export function Desbloquear({ codigo }: { codigo: string }) {
  const [estado, acao] = useActionState(confirmar, {} as EstadoForm);

  return (
    <section className="vidro mt-5 border-marca-500/25 p-6 sm:p-8">
      <h2 className="text-xl font-bold">Ver orçamento e falar com a loja</h2>
      <p className="mt-2 leading-relaxed text-white/55">
        O CPF mostra onde está o seu aparelho. Para ver o valor, o que o técnico
        encontrou, conversar com a loja e aprovar o serviço, confirme os{" "}
        <strong className="text-white">4 últimos dígitos</strong> do telefone que você
        deixou no cadastro.
      </p>

      <form action={acao} className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
        <input type="hidden" name="codigo" value={codigo} />
        <div className="sm:w-48">
          <label htmlFor="digitos" className="rotulo-noite">
            Fim do telefone
          </label>
          <input
            id="digitos"
            name="digitos"
            required
            inputMode="numeric"
            maxLength={4}
            pattern="[0-9]{4}"
            autoComplete="off"
            className="campo-noite text-center text-xl font-bold tracking-[0.4em]"
            placeholder="0000"
          />
        </div>
        <Botao />
      </form>

      {estado.erro && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
        >
          {estado.erro}
        </p>
      )}
    </section>
  );
}
