"use client";

/** Botão de imprimir, escondido na própria impressão. */
export function Imprimir() {
  return (
    <div className="mb-6 flex justify-end print:hidden">
      <button type="button" onClick={() => window.print()} className="btn-primario">
        Imprimir
      </button>
    </div>
  );
}
