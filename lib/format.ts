/** Formatação para o balcão brasileiro. */

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function moeda(valor: number | null | undefined): string {
  return BRL.format(valor ?? 0);
}

/**
 * Guardamos telefone só com dígitos (a confirmação do portal compara os 4
 * últimos), então a máscara é aplicada apenas na hora de mostrar.
 */
export function soDigitos(v: string): string {
  return v.replace(/\D/g, "");
}

export function telefone(v: string | null | undefined): string {
  const d = soDigitos(v ?? "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return v ?? "";
}

export function data(v: string | null | undefined): string {
  if (!v) return "—";
  // Data pura (YYYY-MM-DD) não tem fuso. Interpretá-la como UTC e exibir em
  // horário de Brasília joga o dia para trás; por isso o corte manual.
  const [ano, mes, dia] = v.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}

export function dataHora(v: string | null | undefined): string {
  if (!v) return "—";
  return new Date(v).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "há 2 dias", "agora há pouco" — para a lista, onde a data exata atrapalha. */
export function desde(v: string): string {
  const ms = Date.now() - new Date(v).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 2) return "agora há pouco";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "ontem";
  if (d < 30) return `há ${d} dias`;
  const m = Math.floor(d / 30);
  return m === 1 ? "há 1 mês" : `há ${m} meses`;
}

/** Dias restantes até uma data. Negativo = já passou. */
export function diasAte(dataISO: string | null | undefined): number | null {
  if (!dataISO) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const [ano, mes, dia] = dataISO.slice(0, 10).split("-").map(Number);
  const alvo = new Date(ano, mes - 1, dia);
  return Math.round((alvo.getTime() - hoje.getTime()) / 86400000);
}

/**
 * Link de WhatsApp com a mensagem já escrita.
 *
 * É de propósito que isto não seja uma integração com a API oficial: o
 * atendente clica, o WhatsApp dele abre com o texto pronto e ele só aperta
 * enviar. Custa uma função e resolve a maior parte do valor de "avisar o
 * cliente" sem conta de negócio, verificação de template nem custo por
 * mensagem.
 */
export function linkWhatsapp(numero: string, texto: string): string {
  const d = soDigitos(numero);
  const comPais = d.startsWith("55") ? d : `55${d}`;
  return `https://wa.me/${comPais}?text=${encodeURIComponent(texto)}`;
}
