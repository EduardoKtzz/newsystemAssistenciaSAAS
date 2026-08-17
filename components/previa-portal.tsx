/**
 * O celular da tela de entrada, com a prévia do portal por dentro.
 *
 * Existe para responder, sem texto, a pergunta que o cliente faz ao
 * entregar o aparelho: "e agora, como eu fico sabendo?". Mostrar a tela
 * pronta convence mais rápido que qualquer parágrafo explicando.
 *
 * É HTML estático, sem imagem e sem script: escala em qualquer tela, pesa
 * nada e nunca fica desatualizado em relação ao portal de verdade — os
 * dados aqui são de exemplo, mas o layout é o mesmo componente visual.
 */
export function PreviaPortal() {
  return (
    <div className="relative mx-auto w-[19rem] max-w-full">
      {/* O brilho por trás do aparelho. Separado do celular para não entrar
          no overflow-hidden da tela. */}
      <div
        aria-hidden
        className="absolute -inset-8 -z-10 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(46,155,255,.30), transparent 75%)",
        }}
      />

      <div className="rounded-[2.5rem] border border-white/12 bg-[#0b0d12] p-2.5 shadow-[0_40px_90px_-25px_rgba(0,0,0,.95)]">
        <div className="relative overflow-hidden rounded-[2rem] bg-[#0f1218] px-4 pb-5 pt-6">
          {/* ilha da câmera */}
          <div className="absolute left-1/2 top-2.5 h-4 w-16 -translate-x-1/2 rounded-full bg-black/70" />

          <div className="mt-4 flex items-center justify-between">
            <span className="text-[11px] font-bold text-marca-400">FixCell Centro</span>
            <span className="text-[10px] text-white/30">OS #143</span>
          </div>

          <p className="mt-4 text-[11px] text-white/40">Seu iPhone 12 Preto:</p>
          <p className="mt-0.5 text-[19px] font-bold leading-tight text-white">
            Pronto para retirada
          </p>

          {/* trilha */}
          <div className="mt-4 flex gap-1">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <span
                key={i}
                className={`h-1 flex-1 rounded-full ${
                  i <= 5 ? "bg-marca-500" : "bg-white/12"
                }`}
              />
            ))}
          </div>
          <p className="mt-2 text-[10px] text-white/35">
            Pode buscar hoje, até as 18h.
          </p>

          {/* orçamento aprovado */}
          <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-white/35">
                Orçamento
              </span>
              <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[9px] font-semibold text-emerald-300">
                aprovado
              </span>
            </div>
            <div className="mt-1.5 flex items-baseline justify-between">
              <span className="text-[11px] text-white/55">Tela AMOLED + mão de obra</span>
              <span className="text-[15px] font-bold text-white">R$ 480,00</span>
            </div>
          </div>

          {/* conversa */}
          <div className="mt-3 space-y-1.5">
            <div className="mr-6 rounded-lg rounded-bl-sm bg-white/[0.07] px-2.5 py-1.5">
              <p className="text-[10px] leading-snug text-white/70">
                Terminamos! Pode passar aqui quando quiser.
              </p>
            </div>
            <div className="ml-8 rounded-lg rounded-br-sm bg-marca-500/20 px-2.5 py-1.5">
              <p className="text-[10px] leading-snug text-marca-100">
                Chego às 17h, obrigado!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
