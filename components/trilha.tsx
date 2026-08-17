import { STATUS, TRILHA, type OsStatus } from "@/lib/status";

/**
 * A régua de progresso do conserto.
 *
 * A pergunta que o cliente traz é sempre "falta muito?", e uma etiqueta de
 * status sozinha não responde: "em reparo" não diz se isso é o começo ou o
 * fim. A trilha mostra o caminho inteiro e onde ele está dentro dele.
 *
 * Recusado e cancelado não têm etapa (`etapa: null`) porque saíram do
 * caminho — desenhar uma régua para eles sugeriria um progresso que não
 * existe. Nesses casos o componente não é renderizado.
 */
export function Trilha({ status, escuro = false }: { status: OsStatus; escuro?: boolean }) {
  const atual = STATUS[status].etapa;
  if (atual === null) return null;

  return (
    <ol className="flex items-start gap-1">
      {TRILHA.map((s) => {
        const etapa = STATUS[s].etapa!;
        const feito = etapa < atual;
        const agora = etapa === atual;

        return (
          <li key={s} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex w-full items-center">
              <span
                className={`h-1 flex-1 rounded-full ${
                  feito || agora
                    ? "bg-marca-500"
                    : escuro
                      ? "bg-white/12"
                      : "bg-slate-200"
                }`}
              />
            </div>
            <span
              className={`text-center text-[10px] leading-tight sm:text-xs ${
                agora
                  ? escuro
                    ? "font-semibold text-marca-300"
                    : "font-semibold text-marca-700"
                  : feito
                    ? escuro
                      ? "text-white/45"
                      : "text-slate-500"
                    : escuro
                      ? "text-white/20"
                      : "text-slate-300"
              }`}
            >
              {STATUS[s].publico}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
