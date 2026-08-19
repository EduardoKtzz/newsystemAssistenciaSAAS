/**
 * O ciclo de vida da OS.
 *
 * Tudo que a interface sabe sobre status vem daqui: rótulo do balcão,
 * rótulo do portal, cor, posição na trilha e para onde é possível ir a
 * seguir. Nenhuma tela inventa nome de status por conta própria.
 *
 * Os rótulos são dois de propósito. No painel a loja lê "Aguardando peça",
 * jargão dela. No portal o cliente lê "Peça a caminho" — mesma situação,
 * dita para quem está esperando o aparelho e não conhece o fluxo interno.
 */

export type OsStatus =
  | "recebido"
  | "diagnostico"
  | "orcamento_enviado"
  | "aprovado"
  | "recusado"
  | "aguardando_peca"
  | "em_reparo"
  | "pronto"
  | "entregue"
  | "cancelado";

type StatusInfo = {
  /** Como a loja chama, no painel. */
  label: string;
  /** Como o cliente lê, no portal. */
  publico: string;
  /** Frase que explica ao cliente o que está acontecendo agora. */
  explicacao: string;
  /** Posição na trilha do portal. `null` = fora do caminho feliz. */
  etapa: number | null;
  /** Classes da etiqueta no painel claro. */
  cor: string;
  /** Classes da etiqueta nas telas escuras do cliente. */
  corNoite: string;
  /** Claro + escuro na mesma etiqueta, para o painel que troca de tema. */
  corAdaptavel: string;
  /** Para onde a loja pode mover a OS a partir daqui. */
  proximos: OsStatus[];
};

export const STATUS: Record<OsStatus, StatusInfo> = {
  recebido: {
    label: "Recebido",
    publico: "Aparelho recebido",
    explicacao: "Recebemos seu aparelho e ele entrou na fila de análise.",
    etapa: 1,
    cor: "bg-slate-100 text-slate-700 ring-slate-200",
    corNoite: "bg-white/8 text-white/70 ring-white/15",
    corAdaptavel: "bg-slate-100 text-slate-700 ring-slate-200 escuro:bg-white/8 escuro:text-white/70 escuro:ring-white/15",
    proximos: ["diagnostico", "cancelado"],
  },
  diagnostico: {
    label: "Em diagnóstico",
    publico: "Em análise",
    explicacao:
      "Nosso técnico está avaliando o aparelho para identificar a causa do problema.",
    etapa: 2,
    cor: "bg-amber-100 text-amber-800 ring-amber-200",
    corNoite: "bg-amber-400/12 text-amber-200 ring-amber-300/25",
    corAdaptavel: "bg-amber-100 text-amber-800 ring-amber-200 escuro:bg-amber-400/12 escuro:text-amber-200 escuro:ring-amber-300/25",
    proximos: ["orcamento_enviado", "cancelado"],
  },
  orcamento_enviado: {
    label: "Orçamento enviado",
    publico: "Orçamento disponível",
    explicacao:
      "O diagnóstico terminou e o orçamento está abaixo. O serviço só começa depois que você aprovar.",
    etapa: 3,
    cor: "bg-sky-100 text-sky-800 ring-sky-200",
    corNoite: "bg-sky-400/14 text-sky-200 ring-sky-300/30",
    corAdaptavel: "bg-sky-100 text-sky-800 ring-sky-200 escuro:bg-sky-400/14 escuro:text-sky-200 escuro:ring-sky-300/30",
    proximos: ["aprovado", "recusado", "cancelado"],
  },
  aprovado: {
    label: "Aprovado",
    publico: "Orçamento aprovado",
    explicacao: "Você aprovou o orçamento. O serviço foi liberado para execução.",
    etapa: 4,
    cor: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    corNoite: "bg-emerald-400/14 text-emerald-200 ring-emerald-300/30",
    corAdaptavel: "bg-emerald-100 text-emerald-800 ring-emerald-200 escuro:bg-emerald-400/14 escuro:text-emerald-200 escuro:ring-emerald-300/30",
    proximos: ["em_reparo", "cancelado"],
  },
  recusado: {
    label: "Recusado",
    publico: "Orçamento recusado",
    explicacao:
      "Você recusou o orçamento. O aparelho está disponível para retirada sem custo de serviço.",
    etapa: null,
    cor: "bg-rose-100 text-rose-800 ring-rose-200",
    corNoite: "bg-rose-400/14 text-rose-200 ring-rose-300/30",
    corAdaptavel: "bg-rose-100 text-rose-800 ring-rose-200 escuro:bg-rose-400/14 escuro:text-rose-200 escuro:ring-rose-300/30",
    proximos: ["pronto", "orcamento_enviado", "cancelado"],
  },
  // Fora da trilha e fora de qualquer transição: a loja não move mais a OS
  // para cá. A definição fica porque o valor continua existindo no enum do
  // banco, e sumir com ela quebraria a tela de qualquer linha antiga.
  aguardando_peca: {
    label: "Aguardando peça",
    publico: "Peça a caminho",
    explicacao:
      "A peça necessária foi pedida ao fornecedor. Assim que chegar, o reparo começa.",
    etapa: null,
    cor: "bg-violet-100 text-violet-800 ring-violet-200",
    corNoite: "bg-violet-400/14 text-violet-200 ring-violet-300/30",
    corAdaptavel: "bg-violet-100 text-violet-800 ring-violet-200 escuro:bg-violet-400/14 escuro:text-violet-200 escuro:ring-violet-300/30",
    proximos: ["em_reparo", "cancelado"],
  },
  em_reparo: {
    label: "Em reparo",
    publico: "Em reparo",
    explicacao: "Seu aparelho está na bancada, com o serviço em andamento.",
    etapa: 5,
    cor: "bg-blue-100 text-blue-800 ring-blue-200",
    corNoite: "bg-marca-400/14 text-marca-200 ring-marca-300/30",
    corAdaptavel: "bg-blue-100 text-blue-800 ring-blue-200 escuro:bg-marca-400/14 escuro:text-marca-200 escuro:ring-marca-300/30",
    proximos: ["pronto", "cancelado"],
  },
  pronto: {
    label: "Pronto para retirada",
    publico: "Pronto para retirada",
    explicacao: "Serviço concluído. Seu aparelho já pode ser retirado na loja.",
    etapa: 6,
    cor: "bg-teal-100 text-teal-800 ring-teal-200",
    corNoite: "bg-teal-400/14 text-teal-200 ring-teal-300/30",
    corAdaptavel: "bg-teal-100 text-teal-800 ring-teal-200 escuro:bg-teal-400/14 escuro:text-teal-200 escuro:ring-teal-300/30",
    proximos: ["entregue"],
  },
  entregue: {
    label: "Entregue",
    publico: "Entregue",
    explicacao: "Aparelho entregue. A garantia do serviço começa a contar desta data.",
    etapa: 7,
    cor: "bg-slate-100 text-slate-500 ring-slate-200",
    corNoite: "bg-white/6 text-white/45 ring-white/12",
    corAdaptavel: "bg-slate-100 text-slate-500 ring-slate-200 escuro:bg-white/6 escuro:text-white/45 escuro:ring-white/12",
    proximos: [],
  },
  cancelado: {
    label: "Cancelado",
    publico: "Cancelado",
    explicacao: "Esta ordem de serviço foi cancelada.",
    etapa: null,
    cor: "bg-slate-200 text-slate-600 ring-slate-300",
    corNoite: "bg-white/8 text-white/50 ring-white/15",
    corAdaptavel: "bg-slate-200 text-slate-600 ring-slate-300 escuro:bg-white/8 escuro:text-white/50 escuro:ring-white/15",
    proximos: [],
  },
};

/** A trilha que o portal desenha, em ordem. */
export const TRILHA: OsStatus[] = [
  "recebido",
  "diagnostico",
  "orcamento_enviado",
  "aprovado",
  "em_reparo",
  "pronto",
  "entregue",
];

/** Status em que a OS ainda ocupa espaço na bancada. */
export const ABERTOS: OsStatus[] = [
  "recebido",
  "diagnostico",
  "orcamento_enviado",
  "aprovado",
  "em_reparo",
  "pronto",
];

export function ehStatus(v: string): v is OsStatus {
  return v in STATUS;
}

/**
 * A OS está parada esperando o cliente decidir? Enquanto for verdade a
 * bancada não pode fazer nada, e é o que o painel destaca em primeiro lugar.
 */
export function esperandoCliente(status: OsStatus): boolean {
  return status === "orcamento_enviado";
}
