"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { criarConta, entrar, type EstadoForm } from "./actions";

const VAZIO: EstadoForm = {};

/* O que existe atrás da porta.
 *
 * A coluna da esquerda precisava de conteúdo de verdade: decoração ali vira
 * mais um retângulo que o olho aprende a descartar. Estas três linhas saem
 * do que o painel realmente faz, e não da imaginação — se o produto mudar,
 * elas mudam junto.
 *
 * As três afirmam, e não rotulam. A versão anterior ("As ordens de serviço",
 * "O orçamento...") era um menu escrito por extenso: abria com artigo, ecoava
 * o subtítulo logo acima e não dizia nada que a pessoa já não soubesse.
 *
 * A ordem é o arco do conserto: o aparelho entra e ganha status, o dinheiro
 * é combinado e fechado, e o cliente acompanha os dois sozinho. A última é a
 * decisão que organiza o produto inteiro — quem precisa de acompanhamento é
 * justamente quem está sem o celular, então não pode haver app nem senha.
 *
 * Cuidado ao mexer: "valor final" na linha 2 existe porque a OS guarda
 * valor_orcado E valor_final, que podem divergir. Prometer que o orçamento
 * aprovado encerra a conversa seria desmentido pelo próprio banco. */
const DO_OUTRO_LADO = [
  "Todo aparelho tem um status, do balcão à entrega",
  "Orçamento enviado, aprovado, valor final fechado",
  "Cliente sem celular acompanha sem app nem senha",
];

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

  /*
    Duas colunas no desktop, uma no celular.

    A coluna única servia as duas telas com a mesma régua estreita, e num
    monitor a tela virava uma tira de celular no meio do vazio. Aqui o texto
    fica na esquerda e o formulário na direita — a ordem em que se lê: antes
    onde eu estou, depois o que eu preencho.

    O grid colapsa para uma coluna abaixo de lg e volta a ser exatamente o
    que era: junto, sem respiro sobrando. Numa tela onde o polegar alcança
    tudo, espaço vazio é rolagem a mais, e não elegância.

    Os tamanhos de título sobem por degrau (3xl no celular, 4xl no tablet,
    3.25rem no desktop) em vez de escalar sozinhos: com clamp() o título fica
    do tamanho da janela, e a janela do desktop é grande demais para uma
    frase de três palavras.
  */
  return (
    <div className="grid w-full items-center gap-7 lg:grid-cols-[1fr_26rem] lg:gap-14 xl:grid-cols-[1fr_28rem] xl:gap-20">
      <div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-[3.25rem] lg:leading-[1.05]">
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
        <p className="mt-3 leading-relaxed text-white/55 lg:mt-5 lg:max-w-md lg:text-lg">
          {novo
            ? "Depois de criar a conta você preenche os dados da assistência."
            : "Acesse as ordens de serviço da sua loja."}
        </p>

        {/* Escondida no celular de propósito: ali ela empurraria o formulário
            para baixo da dobra, e quem abre esta tela veio entrar, não ler. */}
        <ul className="mt-10 hidden space-y-4 lg:block">
          {DO_OUTRO_LADO.map((item) => (
            <li key={item} className="flex items-start gap-3 text-white/45">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-marca-400" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="lg:relative">
        <form action={novo ? acaoCadastro : acaoLogin} className="vidro space-y-5 p-6 sm:p-8">
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

        {/* No desktop este botão sai do fluxo (lg:absolute).

            Ele é o motivo de o cartão parecer alto demais: com o botão dentro da
            coluna, o items-center do grid centraliza "formulário + 24px + botão",
            e o cartão sobe metade da altura do que vem embaixo dele — uns 22px
            acima do centro do texto ao lado. Tirando o botão do fluxo, a coluna
            volta a medir só o cartão, e aí o que fica centralizado é o cartão.

            top-full o recoloca logo abaixo do formulário, e a margem continua
            valendo em elemento absoluto — então a distância dos 24px não muda.
            No celular ele volta a ser um elemento normal em fluxo. */}
        <button
          type="button"
          onClick={() => setNovo((v) => !v)}
          className="mt-6 w-full text-sm text-white/45 transition hover:text-marca-300
                     lg:absolute lg:inset-x-0 lg:top-full"
        >
          {novo ? "Já tenho conta — entrar" : "Não tenho conta — cadastrar minha loja"}
        </button>
      </div>
    </div>
  );
}
