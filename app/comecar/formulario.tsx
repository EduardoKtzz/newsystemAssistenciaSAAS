"use client";

import { useActionState } from "react";
import { BotaoEnvio } from "@/components/botao-envio";
import { criarLoja, type EstadoForm } from "./actions";

export function FormularioLoja() {
  const [estado, acao] = useActionState(criarLoja, {} as EstadoForm);

  return (
    <form action={acao} className="mt-6 space-y-4">
      <div>
        <label htmlFor="nome" className="rotulo">
          Nome da loja
        </label>
        <input id="nome" name="nome" required className="campo" placeholder="FixCell Centro" />
      </div>

      <div>
        <label htmlFor="seu_nome" className="rotulo">
          Seu nome
        </label>
        <input id="seu_nome" name="seu_nome" className="campo" placeholder="Eduardo" />
      </div>

      <div>
        <label htmlFor="telefone" className="rotulo">
          WhatsApp da loja
        </label>
        <input
          id="telefone"
          name="telefone"
          required
          inputMode="tel"
          className="campo"
          placeholder="(47) 99999-0000"
        />
        <p className="mt-1 text-xs text-slate-500">
          É por onde o cliente entra em contato pelo comprovante.
        </p>
      </div>

      <div>
        <label htmlFor="endereco" className="rotulo">
          Endereço
        </label>
        <input
          id="endereco"
          name="endereco"
          className="campo"
          placeholder="Rua das Flores, 120 — Centro"
        />
      </div>

      <div>
        <label htmlFor="garantia_dias" className="rotulo">
          Garantia do serviço (dias)
        </label>
        <input
          id="garantia_dias"
          name="garantia_dias"
          type="number"
          min={90}
          defaultValue={90}
          className="campo"
        />
        <p className="mt-1 text-xs text-slate-500">
          O mínimo legal é 90 dias (CDC art. 26). Você pode oferecer mais.
        </p>
      </div>

      {estado.erro && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{estado.erro}</p>
      )}

      <BotaoEnvio className="btn-primario w-full py-2.5" carregando="Criando loja...">
        Concluir cadastro
      </BotaoEnvio>
    </form>
  );
}
