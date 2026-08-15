"use client";

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
  ...props
}: React.ComponentProps<"button"> & { carregando?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className} {...props}>
      {pending ? carregando : children}
    </button>
  );
}
