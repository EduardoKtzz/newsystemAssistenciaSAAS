"use client";

import { useRef } from "react";

/**
 * Janela sobreposta, com o `<dialog>` nativo.
 *
 * O conteúdo chega como `children` — pode vir pronto do servidor, então
 * formulários com Server Action funcionam aqui dentro sem virar
 * componente de cliente.
 *
 * Fechar depois de enviar é responsabilidade do formulário: um `<button
 * formmethod="dialog">` ou o `onClick` do próprio botão. Aqui a janela só
 * abre e fecha.
 */
export function Modal({
  rotulo,
  titulo,
  descricao,
  children,
  classeBotao = "btn-secundario",
  largura = "max-w-lg",
  aoAbrir,
}: {
  /** O que aparece no botão que abre. */
  rotulo: React.ReactNode;
  titulo: string;
  descricao?: string;
  children: React.ReactNode;
  classeBotao?: string;
  largura?: string;
  /**
   * Roda quando a janela abre. Recebe uma Server Action já com os
   * argumentos presos (`acao.bind(null, id)`), porque função inline não
   * atravessa a fronteira servidor/cliente.
   *
   * Serve para o efeito colateral que só faz sentido depois de a pessoa
   * realmente olhar — marcar mensagem como lida, por exemplo.
   */
  aoAbrir?: () => Promise<unknown>;
}) {
  const janela = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        className={classeBotao}
        onClick={() => {
          janela.current?.showModal();
          void aoAbrir?.();
        }}
      >
        {rotulo}
      </button>

      <dialog
        ref={janela}
        aria-label={titulo}
        className={`w-[calc(100vw-2rem)] ${largura} rounded-2xl p-0 shadow-2xl`}
        // Clique no fundo fecha. O alvo só é o próprio <dialog> quando o
        // clique cai fora da caixa de conteúdo — dentro dela, o alvo é
        // algum filho, e a janela continua aberta.
        onClick={(e) => {
          if (e.target === janela.current) janela.current?.close();
        }}
      >
        <div className="flex items-start justify-between gap-4 border-b p-5" style={{ borderColor: "var(--borda)" }}>
          <div>
            <h2 className="text-lg font-bold txt-forte">{titulo}</h2>
            {descricao && <p className="mt-0.5 text-sm txt-medio">{descricao}</p>}
          </div>
          <button
            type="button"
            onClick={() => janela.current?.close()}
            className="btn-fantasma -mr-2 -mt-1 px-2 text-xl leading-none"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-5">{children}</div>
      </dialog>
    </>
  );
}
