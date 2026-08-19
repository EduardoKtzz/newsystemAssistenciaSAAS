"use client";

import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

/**
 * Botão de formulário que se desativa sozinho enquanto a ação roda.
 *
 * Sem isso, o duplo clique impaciente do balcão cria duas OS ou manda a
 * mesma mensagem duas vezes. `useFormStatus` só funciona dentro do <form>,
 * o que obriga este componente a ser separado do formulário que o contém.
 */
export function BotaoEnvio({
  children,
  carregando = "Salvando...",
  className = "btn-primario",
  fechaModal = false,
  ...props
}: React.ComponentProps<"button"> & {
  carregando?: string;
  /** Fecha o `<dialog>` em volta assim que a ação termina. */
  fechaModal?: boolean;
}) {
  const { pending } = useFormStatus();
  const botao = useRef<HTMLButtonElement>(null);
  const rodava = useRef(false);

  useEffect(() => {
    // A janela fecha na descida do `pending`, e não no clique: fechar no
    // clique esconderia um erro que a ação ainda vai devolver.
    if (fechaModal && rodava.current && !pending) {
      botao.current?.closest("dialog")?.close();
    }
    rodava.current = pending;
  }, [pending, fechaModal]);

  return (
    <button ref={botao} type="submit" disabled={pending} className={className} {...props}>
      {pending ? carregando : children}
    </button>
  );
}
