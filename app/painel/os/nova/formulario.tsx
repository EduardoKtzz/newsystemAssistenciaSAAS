"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CampoCpf, CampoTelefone } from "@/components/campos-mascarados";
import { BotaoEnvio } from "@/components/botao-envio";
import { abrirOs, type EstadoForm } from "./actions";

/**
 * O cadastro de entrada do aparelho.
 *
 * Todo campo lê o `defaultValue` do que voltou do servidor. O React 19 dá
 * reset no formulário assim que a ação responde, e sem isso um erro de
 * validação apaga o cadastro inteiro — com o cliente esperando no balcão,
 * é o tipo de detalhe que faz a loja desistir do sistema.
 */
export function FormularioNovaOs() {
  const [estado, acao] = useActionState(abrirOs, {} as EstadoForm);
  const v = estado.valores ?? {};

  return (
    <form action={acao} className="space-y-6">
      <fieldset className="cartao p-6">
        <legend className="px-2 text-sm font-semibold text-slate-700 escuro:text-slate-300">
          Cliente
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="cliente_nome" className="rotulo">
              Nome completo
            </label>
            <input
              id="cliente_nome"
              name="cliente_nome"
              required
              className="campo"
              defaultValue={v.cliente_nome ?? ""}
            />
          </div>
          <div>
            <label htmlFor="cliente_telefone" className="rotulo">
              Telefone com DDD
            </label>
            <CampoTelefone
              id="cliente_telefone"
              name="cliente_telefone"
              required
              className="campo"
              placeholder="(47) 99999-0000"
              defaultValue={v.cliente_telefone ?? ""}
            />
            <p className="mt-1 text-xs text-slate-500 escuro:text-slate-400">
              Os 4 últimos dígitos são a confirmação do cliente no portal.
            </p>
          </div>
          <div>
            <label htmlFor="cliente_cpf" className="rotulo">
              CPF{" "}
              <span className="font-normal text-slate-400 escuro:text-slate-500">
                (recomendado)
              </span>
            </label>
            <CampoCpf
              id="cliente_cpf"
              name="cliente_cpf"
              className="campo"
              placeholder="000.000.000-00"
              defaultValue={v.cliente_cpf ?? ""}
            />
            <p className="mt-1 text-xs text-slate-500 escuro:text-slate-400">
              É como o cliente entra no portal depois que perde o comprovante.
            </p>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="cliente_email" className="rotulo">
              E-mail{" "}
              <span className="font-normal text-slate-400 escuro:text-slate-500">
                (opcional)
              </span>
            </label>
            <input
              id="cliente_email"
              name="cliente_email"
              type="email"
              className="campo"
              defaultValue={v.cliente_email ?? ""}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="cartao p-6">
        <legend className="px-2 text-sm font-semibold text-slate-700 escuro:text-slate-300">
          Aparelho
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="marca" className="rotulo">
              Marca
            </label>
            <input
              id="marca"
              name="marca"
              required
              className="campo"
              placeholder="Apple"
              defaultValue={v.marca ?? ""}
            />
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
              defaultValue={v.modelo ?? ""}
            />
          </div>
          <div>
            <label htmlFor="cor" className="rotulo">
              Cor
            </label>
            <input
              id="cor"
              name="cor"
              className="campo"
              placeholder="Preto"
              defaultValue={v.cor ?? ""}
            />
          </div>
          <div>
            <label htmlFor="imei" className="rotulo">
              IMEI{" "}
              <span className="font-normal text-slate-400 escuro:text-slate-500">
                (recomendado)
              </span>
            </label>
            <input
              id="imei"
              name="imei"
              inputMode="numeric"
              maxLength={17}
              className="campo"
              defaultValue={v.imei ?? ""}
            />
            <p className="mt-1 text-xs text-slate-500 escuro:text-slate-400">
              Liga esta OS ao histórico e à garantia do mesmo aparelho.
            </p>
          </div>
        </div>
      </fieldset>

      <fieldset className="cartao p-6">
        <legend className="px-2 text-sm font-semibold text-slate-700 escuro:text-slate-300">
          Entrada
        </legend>
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
              defaultValue={v.defeito_relatado ?? ""}
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
              defaultValue={v.senha_aparelho ?? ""}
            />
            <p className="mt-1 text-xs text-slate-500 escuro:text-slate-400">
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
              defaultValue={v.acessorios ?? ""}
            />
          </div>
          <div>
            <label htmlFor="prazo_estimado" className="rotulo">
              Previsão de entrega
            </label>
            <input
              id="prazo_estimado"
              name="prazo_estimado"
              type="date"
              className="campo"
              defaultValue={v.prazo_estimado ?? ""}
            />
          </div>
        </div>
      </fieldset>

      {estado.erro && (
        <p
          role="alert"
          className="rounded-lg bg-rose-50 escuro:bg-rose-500/10 px-3 py-2 text-sm text-rose-700 escuro:text-rose-200"
        >
          {estado.erro}
        </p>
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
