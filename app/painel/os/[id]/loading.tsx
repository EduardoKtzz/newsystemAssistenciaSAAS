/**
 * A espera da tela de trabalho de uma OS.
 *
 * Esta é a navegação mais cara do painel — foi medida em 2,7s — e também a
 * mais frequente: o atendente entra e sai dela o dia inteiro. Sem esqueleto,
 * clicar numa linha da lista deixava a lista inteira congelada, e a única
 * pista de que algo aconteceu era a barra do navegador.
 *
 * O "← Voltar para a lista" é renderizado de verdade, e não como barra
 * cinza. É o único elemento aqui que já funciona durante a espera: quem
 * clicou na OS errada volta na hora, sem esperar a errada abrir.
 */
export default function Carregando() {
  return (
    <>
      <span className="text-sm txt-medio">← Voltar para a lista</span>

      <header className="cartao mt-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
          <div className="min-w-0 space-y-2.5">
            <div className="flex items-center gap-3">
              <Barra className="h-7 w-28" />
              <Barra className="h-6 w-32 rounded-full" />
            </div>
            <Barra className="h-5 w-52" />
            <Barra className="h-4 w-72 max-w-full" />
          </div>
          <div className="flex items-center gap-2">
            <Barra className="h-9 w-9 rounded-lg" />
            <Barra className="h-9 w-9 rounded-lg" />
            <Barra className="h-9 w-36 rounded-lg" />
          </div>
        </div>
      </header>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          <div className="cartao space-y-3 p-6">
            <Barra className="h-3 w-24" />
            <Barra className="h-4 w-full" />
            <Barra className="h-4 w-4/5" />
          </div>
          <div className="cartao space-y-3 p-6">
            <Barra className="h-3 w-32" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-4">
                <Barra className="h-4 w-48" />
                <Barra className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="cartao space-y-3 p-6">
            <Barra className="h-3 w-20" />
            <Barra className="h-8 w-32" />
            <Barra className="h-4 w-40" />
          </div>
          <div className="cartao space-y-3 p-6">
            <Barra className="h-3 w-28" />
            {Array.from({ length: 3 }).map((_, i) => (
              <Barra key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>
      </div>

      <p className="sr-only" role="status">
        Carregando a ordem de serviço.
      </p>
    </>
  );
}

function Barra({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-md bg-slate-200 escuro:bg-white/10 ${className}`} />
  );
}
