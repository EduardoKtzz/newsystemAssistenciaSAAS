"use client";

import { useState } from "react";

/** Copia um texto e confirma na hora — o atendente está com o cliente na frente. */
export function Copiar({
  texto,
  children,
  className = "btn-secundario",
}: {
  texto: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [copiado, setCopiado] = useState(false);

  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texto);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 2000);
        } catch {
          // Sem permissão de área de transferência (http em rede local, por
          // exemplo). O texto continua visível na tela para copiar na mão.
        }
      }}
    >
      {copiado ? "Copiado!" : children}
    </button>
  );
}
