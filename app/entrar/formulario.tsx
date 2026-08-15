"use client";

import { useActionState, useState } from "react";
import { BotaoEnvio } from "@/components/botao-envio";
import { criarConta, entrar, type EstadoForm } from "./actions";

const VAZIO: EstadoForm = {};

export function FormularioEntrada({ proximo }: { proximo: string }) {
  const [novo, setNovo] = useState(false);

  // Dois estados separados para a mensagem de erro de um modo não vazar
  // para o outro quando o usuário alterna entre entrar e cadastrar.
  const [estLogin, acaoLogin] = useActionState(entrar, VAZIO);
  const [estCadastro, acaoCadastro] = useActionState(criarConta, VAZIO);
  const estado = novo ? estCadastro : estLogin;

  return (
    <>
      <h1 className="text-xl font-bold text-slate-900">
        {novo ? "Criar conta da assistência" : "Entrar no painel"}
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        {novo
          ? "Depois de criar a conta você cadastra os dados da loja."
          : "Acesse as ordens de serviço da sua loja."}
      </p>

      <form action={novo ? acaoCadastro : acaoLogin} className="mt-6 space-y-4">
        <input type="hidden" name="proximo" value={proximo} />

        <div>
          <label htmlFor="email" className="rotulo">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="campo"
            placeholder="voce@sualoja.com.br"
          />
        </div>

        <div>
          <label htmlFor="senha" className="rotulo">
            Senha
          </label>
          <input
            id="senha"
            name="senha"
            type="password"
            required
            minLength={6}
            autoComplete={novo ? "new-password" : "current-password"}
            className="campo"
            placeholder="••••••••"
          />
        </div>

        {estado.erro && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {estado.erro}
          </p>
        )}
        {estado.aviso && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {estado.aviso}
          </p>
        )}

        <BotaoEnvio
          className="btn-primario w-full py-2.5"
          carregando={novo ? "Criando..." : "Entrando..."}
        >
          {novo ? "Criar conta" : "Entrar"}
        </BotaoEnvio>
      </form>

      <button
        type="button"
        onClick={() => setNovo((v) => !v)}
        className="mt-5 w-full text-sm text-slate-600 hover:text-marca-700"
      >
        {novo ? "Já tenho conta — entrar" : "Não tenho conta — cadastrar minha loja"}
      </button>
    </>
  );
}
