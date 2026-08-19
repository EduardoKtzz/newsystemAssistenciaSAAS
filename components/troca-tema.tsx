"use client";

import { useState } from "react";

/**
 * O interruptor de claro/escuro do painel.
 *
 * Escreve o cookie e vira o atributo na mesma hora, sem passar pelo
 * servidor: quem clica vê a troca instantânea, e a próxima visita já
 * chega renderizada no tema certo — sem aquele lampejo branco de quem
 * decide o tema só depois que o JavaScript carrega.
 *
 * O estado inicial vem do servidor por prop justamente por isso. Ler o
 * localStorage no cliente pareceria mais simples e traria o lampejo de
 * volta.
 */
export function TrocaTema({ inicial }: { inicial: "claro" | "escuro" }) {
  const [tema, setTema] = useState(inicial);

  function alternar() {
    const novo = tema === "escuro" ? "claro" : "escuro";
    setTema(novo);
    document.querySelector("[data-tema]")?.setAttribute("data-tema", novo);
    // 1 ano. Preferência de tema não é sessão: quem escolheu escuro uma vez
    // não quer reescolher toda segunda-feira.
    document.cookie = `tema=${novo}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <button
      type="button"
      onClick={alternar}
      className="btn-fantasma px-2.5"
      title={tema === "escuro" ? "Mudar para o modo claro" : "Mudar para o modo escuro"}
      aria-label={tema === "escuro" ? "Mudar para o modo claro" : "Mudar para o modo escuro"}
    >
      {tema === "escuro" ? (
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M20 13.2A8.4 8.4 0 1 1 10.8 4a6.6 6.6 0 0 0 9.2 9.2z" />
        </svg>
      )}
    </button>
  );
}
