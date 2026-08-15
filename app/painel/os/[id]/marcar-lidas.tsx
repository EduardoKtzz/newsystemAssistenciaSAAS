"use client";

import { useEffect } from "react";
import { marcarLidas } from "./actions";

/**
 * Marca as mensagens do cliente como lidas quando a loja abre a OS.
 *
 * Roda no cliente, depois da renderização, porque escrever no banco durante
 * o render de um Server Component é efeito colateral no meio da leitura —
 * o React pode renderizar duas vezes e a página se invalidaria sozinha em
 * laço. Aqui a gravação acontece uma vez, já com a tela na frente do usuário.
 */
export function MarcarLidas({ osId, temNaoLida }: { osId: string; temNaoLida: boolean }) {
  useEffect(() => {
    if (temNaoLida) marcarLidas(osId);
  }, [osId, temNaoLida]);

  return null;
}
