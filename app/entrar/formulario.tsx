"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { criarConta, entrar, type EstadoForm } from "./actions";

const VAZIO: EstadoForm = {};

function Botao({ novo }: { novo: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-brilho">
      {pending ? (novo ? "Criando..." : "Entrando...") : novo ? "Criar conta" : "Entrar"}
    </button>
  );
}

export function FormularioEntrada({ proximo }: { proximo: string }) {
  const [novo, setNovo] = useState(false);

  // Dois estados separados para a mensagem de erro de um modo não vazar
  // para o outro quando o usuário alterna entre entrar e cadastrar.
  const [estLogin, acaoLogin] = useActionState(entrar, VAZIO);
  const [estCadastro, acaoCadastro] = useActionState(criarConta, VAZIO);
  const estado = novo ? estCadastro : estLogin;

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">
        {novo ? (
          <>
            Cadastre <span className="grad-texto">sua loja</span>
          </>
        ) : (
          <>
            Entrar no <span className="grad-texto">painel</span>
          </>
        )}
      </h1>
      <p className="mt-3 leading-relaxed text-white/55">
        {novo
          ? "Depois de criar a conta você preenche os dados da assistência."
          : "Acesse as ordens de serviço da sua loja."}
      </p>

      <form action={novo ? acaoCadastro : acaoLogin} className="vidro mt-7 space-y-5 p-6">
        <input type="hidden" name="proximo" value={proximo} />

        <div>
          <label htmlFor="email" className="rotulo-noite">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="campo-noite"
            placeholder="voce@sualoja.com.br"
          />
        </div>

        <div>
          <label htmlFor="senha" className="rotulo-noite">
            Senha
          </label>
          <input
            id="senha"
            name="senha"
            type="password"
            required
            minLength={6}
            autoComplete={novo ? "new-password" : "current-password"}
            className="campo-noite"
            placeholder="••••••••"
          />
        </div>

        {estado.erro && (
          <p
            role="alert"
            className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
          >
            {estado.erro}
          </p>
        )}
        {estado.aviso && (
          <p
            role="status"
            className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
          >
            {estado.aviso}
          </p>
        )}

        <Botao novo={novo} />
      </form>

      <button
        type="button"
        onClick={() => setNovo((v) => !v)}
        className="mt-6 w-full text-sm text-white/45 transition hover:text-marca-300"
      >
        {novo ? "Já tenho conta — entrar" : "Não tenho conta — cadastrar minha loja"}
      </button>
    </>
  );
}
