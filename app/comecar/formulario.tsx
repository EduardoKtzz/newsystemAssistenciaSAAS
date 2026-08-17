"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { criarLoja, type EstadoForm } from "./actions";

function Botao() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-brilho">
      {pending ? "Criando loja..." : "Concluir cadastro"}
    </button>
  );
}

export function FormularioLoja() {
  const [estado, acao] = useActionState(criarLoja, {} as EstadoForm);

  return (
    <form action={acao} className="vidro mt-7 space-y-5 p-6 sm:p-7">
      <div>
        <label htmlFor="nome" className="rotulo-noite">
          Nome da loja
        </label>
        <input
          id="nome"
          name="nome"
          required
          className="campo-noite"
          placeholder="FixCell Centro"
        />
      </div>

      <div>
        <label htmlFor="seu_nome" className="rotulo-noite">
          Seu nome
        </label>
        <input id="seu_nome" name="seu_nome" className="campo-noite" placeholder="Eduardo" />
      </div>

      <div>
        <label htmlFor="telefone" className="rotulo-noite">
          WhatsApp da loja
        </label>
        <input
          id="telefone"
          name="telefone"
          required
          inputMode="tel"
          className="campo-noite"
          placeholder="(47) 99999-0000"
        />
        <p className="mt-2 text-xs text-white/35">
          É por onde o cliente entra em contato pelo comprovante.
        </p>
      </div>

      <div>
        <label htmlFor="endereco" className="rotulo-noite">
          Endereço
        </label>
        <input
          id="endereco"
          name="endereco"
          className="campo-noite"
          placeholder="Rua das Flores, 120 — Centro"
        />
      </div>

      <div>
        <label htmlFor="garantia_dias" className="rotulo-noite">
          Garantia do serviço (dias)
        </label>
        <input
          id="garantia_dias"
          name="garantia_dias"
          type="number"
          min={90}
          defaultValue={90}
          className="campo-noite w-40"
        />
        <p className="mt-2 text-xs text-white/35">
          O mínimo legal é 90 dias (CDC art. 26). Você pode oferecer mais.
        </p>
      </div>

      {estado.erro && (
        <p
          role="alert"
          className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
        >
          {estado.erro}
        </p>
      )}

      <Botao />
    </form>
  );
}
