/**
 * O que aparece no lugar da lista enquanto ela vem.
 *
 * Sem este arquivo, clicar num filtro não mudava nada na tela: o navegador
 * segurava a página antiga, inteira e imóvel, até o servidor terminar de
 * montar a nova. Com o banco a meio mundo de distância, isso é ~1,5s
 * encarando um botão que não reagiu — e a leitura de quem está no balcão
 * não é "está carregando", é "travou", então a pessoa clica de novo.
 *
 * O trabalho aqui não é ser bonito, é responder na hora. O título é o de
 * verdade porque não depende de dado nenhum, e manter a mesma palavra no
 * mesmo lugar faz a troca parecer continuação em vez de recarga. O resto
 * são barras do tamanho aproximado do conteúdo que vai chegar: quanto mais
 * perto do formato final, menos a tela "pula" quando os dados entram.
 *
 * O cabeçalho do painel (nome da loja, "Novo conserto", tema, sair) fica de
 * fora disto de propósito — ele mora no layout, e o layout continua vivo e
 * clicável durante a espera. Quem clicou no filtro errado pode corrigir sem
 * esperar o errado terminar de carregar.
 */
export default function Carregando() {
  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 escuro:text-slate-100">
            Celulares em manutenção
          </h1>
          <Barra className="mt-2 h-4 w-44" />
        </div>
        <Barra className="h-9 w-80" />
      </div>

      <nav className="mb-4 flex flex-wrap items-center gap-1.5" aria-hidden>
        {[112, 148, 156, 104, 72].map((w, i) => (
          <Barra key={i} className="h-8" estilo={{ width: w }} />
        ))}
      </nav>

      <ul className="cartao divide-y divide-slate-100 escuro:divide-white/8">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4">
            <div className="w-20 shrink-0 space-y-1.5">
              <Barra className="h-4 w-10" />
              <Barra className="h-3 w-14" />
            </div>
            <div className="min-w-52 flex-1 space-y-1.5">
              <Barra className="h-4 w-40" />
              <Barra className="h-3 w-64 max-w-full" />
            </div>
            <Barra className="h-6 w-28 rounded-full" />
            <div className="w-28 space-y-1.5">
              <Barra className="ml-auto h-4 w-20" />
              <Barra className="ml-auto h-3 w-14" />
            </div>
            <Barra className="ml-auto h-3 w-16" />
          </li>
        ))}
      </ul>

      <p className="sr-only" role="status">
        Carregando a lista de consertos.
      </p>
    </>
  );
}

/**
 * Uma barra cinza. `animate-pulse` é a única animação do painel, e ela paga
 * o próprio custo: sem o pulso, a tela parada por 1,5s lê como travada, que
 * é justamente o que este arquivo existe para desfazer.
 */
function Barra({
  className = "",
  estilo,
}: {
  className?: string;
  estilo?: React.CSSProperties;
}) {
  return (
    <div
      style={estilo}
      className={`animate-pulse rounded-md bg-slate-200 escuro:bg-white/10 ${className}`}
    />
  );
}
