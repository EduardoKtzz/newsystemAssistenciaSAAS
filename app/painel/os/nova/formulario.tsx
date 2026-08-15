"use client";

import { useActionState } from "react";
import Link from "next/link";
import { BotaoEnvio } from "@/components/botao-envio";
import { abrirOs, type EstadoForm } from "./actions";

export function FormularioNovaOs() {
  const [estado, acao] = useActionState(abrirOs, {} as EstadoForm);

  return (
    <form action={acao} className="space-y-6">
      <fieldset className="cartao p-6">
        <legend className="px-2 text-sm font-semibold text-slate-700">Cliente</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="cliente_nome" className="rotulo">
              Nome completo
            </label>
            <input id="cliente_nome" name="cliente_nome" required className="campo" />
          </div>
          <div>
            <label htmlFor="cliente_telefone" className="rotulo">
              Telefone com DDD
            </label>
            <input
              id="cliente_telefone"
              name="cliente_telefone"
              required
              inputMode="tel"
              className="campo"
              placeholder="(47) 99999-0000"
            />
            <p className="mt-1 text-xs text-slate-500">
              Os 4 últimos dígitos são a confirmação do cliente no portal.
            </p>
          </div>
          <div>
            <label htmlFor="cliente_email" className="rotulo">
              E-mail <span className="font-normal text-slate-400">(opcional)</span>
            </label>
            <input id="cliente_email" name="cliente_email" type="email" className="campo" />
          </div>
        </div>
      </fieldset>

      <fieldset className="cartao p-6">
        <legend className="px-2 text-sm font-semibold text-slate-700">Aparelho</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="marca" className="rotulo">
              Marca
            </label>
            <input id="marca" name="marca" required className="campo" placeholder="Apple" />
          </div>
          <div>
            <label htmlFor="modelo" className="rotulo">
              Modelo
            </label>
            <input
              id="modelo"
              name="modelo"
              required
              className="campo"
              placeholder="iPhone 12"
            />
          </div>
          <div>
            <label htmlFor="cor" className="rotulo">
              Cor
            </label>
            <input id="cor" name="cor" className="campo" placeholder="Preto" />
          </div>
          <div>
            <label htmlFor="imei" className="rotulo">
              IMEI <span className="font-normal text-slate-400">(recomendado)</span>
            </label>
            <input id="imei" name="imei" inputMode="numeric" className="campo" />
            <p className="mt-1 text-xs text-slate-500">
              Liga esta OS ao histórico e à garantia do mesmo aparelho.
            </p>
          </div>
        </div>
      </fieldset>

      <fieldset className="cartao p-6">
        <legend className="px-2 text-sm font-semibold text-slate-700">Entrada</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="defeito_relatado" className="rotulo">
              Problema relatado pelo cliente
            </label>
            <textarea
              id="defeito_relatado"
              name="defeito_relatado"
              required
              rows={3}
              className="campo"
              placeholder="Caiu na água e não liga mais. Estava carregando normalmente antes."
            />
          </div>
          <div>
            <label htmlFor="senha_aparelho" className="rotulo">
              Senha ou padrão
            </label>
            <input
              id="senha_aparelho"
              name="senha_aparelho"
              className="campo"
              placeholder="1234 ou L invertido"
            />
            <p className="mt-1 text-xs text-slate-500">
              Só a loja vê. Nunca aparece no portal do cliente.
            </p>
          </div>
          <div>
            <label htmlFor="acessorios" className="rotulo">
              Acessórios entregues
            </label>
            <input
              id="acessorios"
              name="acessorios"
              className="campo"
              placeholder="Capa, chip, cartão SD"
            />
          </div>
          <div>
            <label htmlFor="prazo_estimado" className="rotulo">
              Previsão de entrega
            </label>
            <input id="prazo_estimado" name="prazo_estimado" type="date" className="campo" />
          </div>
        </div>
      </fieldset>

      {estado.erro && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{estado.erro}</p>
      )}

      <div className="flex gap-3">
        <BotaoEnvio carregando="Abrindo OS...">Abrir OS</BotaoEnvio>
        <Link href="/painel" className="btn-secundario">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
