"use client";

/**
 * A última rede: falha no próprio layout raiz.
 *
 * Este arquivo substitui o layout inteiro, então não há folha de estilo
 * garantida aqui — por isso o estilo é embutido. É feio de propósito ser
 * simples: se o global-error também depender de algo, não sobra tela.
 */
export default function ErroGlobal({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#0d0818",
          color: "#e8eef6",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: "26rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", margin: 0 }}>O sistema não abriu</h1>
          <p style={{ marginTop: "12px", lineHeight: 1.6, color: "#9fb0c4" }}>
            Alguma coisa falhou antes da página carregar. Tente de novo; se continuar
            assim, avise pelo WhatsApp que eu resolvo.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "20px",
              padding: "12px 22px",
              borderRadius: "10px",
              border: 0,
              background: "#a06bff",
              color: "#16032e",
              fontWeight: 700,
              fontSize: "1rem",
              cursor: "pointer",
            }}
          >
            Tentar de novo
          </button>
        </div>
      </body>
    </html>
  );
}
