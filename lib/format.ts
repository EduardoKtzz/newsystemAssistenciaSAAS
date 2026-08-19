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

/**
 * Lê um número digitado no balcão brasileiro: "1.200,00" vira 1200.
 *
 * Um `replace(",", ".")` sozinho troca só a PRIMEIRA vírgula e deixa o
 * ponto de milhar onde estava, então "1.200,00" virava "1.200.00" e saía
 * NaN. Isso fazia o item do orçamento não ser inserido (sem aviso nenhum,
 * com o formulário limpando) e o sinal recebido ser gravado como zero.
 *
 * Devolve NaN quando não há número, para quem chama decidir o que fazer.
 */
export function numeroBR(bruto: string | null | undefined): number {
  const limpo = String(bruto ?? "").replace(/[^d,.-]/g, "");
  if (!limpo) return NaN;

  // Com vírgula presente, ela é o separador decimal e todo ponto é milhar.
  if (limpo.includes(",")) {
    return Number(limpo.replace(/./g, "").replace(",", "."));
  }

  // Só pontos: "1.200" no balcão é mil e duzentos, não um vírgula dois. O
  // desempate é o último grupo ter exatamente 3 dígitos — "12.5" continua
  // sendo doze e meio.
  const partes = limpo.split(".");
  if (partes.length > 1 && partes[partes.length - 1].length === 3) {
    return Number(partes.join(""));
  }
  return Number(limpo);
}

export function telefone(v: string | null | undefined): string {
  const d = soDigitos(v ?? "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return v ?? "";
}

/**
 * Valida CPF pelos dígitos verificadores.
 *
 * Vale o trabalho porque o CPF virou chave de busca do portal: um dígito
 * errado no cadastro do balcão não dá erro nenhum na hora, e reaparece
 * semanas depois como um cliente que jura que o site não acha a OS dele.
 * Conferir na digitação transforma isso em um aviso imediato.
 */
export function cpfValido(v: string): boolean {
  const d = soDigitos(v);
  if (d.length !== 11) return false;
  // 111.111.111-11 e afins passam na conta dos dígitos, mas não existem.
  if (/^(\d)\1{10}$/.test(d)) return false;

  for (const [ate, pos] of [
    [9, 10],
    [10, 11],
  ]) {
    let soma = 0;
    for (let i = 0; i < ate; i++) soma += Number(d[i]) * (pos - i);
    const resto = (soma * 10) % 11 % 10;
    if (resto !== Number(d[ate])) return false;
  }
  return true;
}

/**
 * Máscara progressiva do CPF, para uso enquanto a pessoa digita.
 *
 * Nunca devolve separador no fim ("123." ou "123.456."). Isso não é
 * estética: com separador pendurado, o backspace apaga o ponto, a máscara
 * o recoloca na hora, e o campo trava sem deixar apagar o dígito de trás.
 * Terminando sempre em dígito, apagar funciona sozinho.
 *
 * Corta em 11 dígitos, então colar um texto qualquer não estoura o campo.
 */
export function mascaraCpf(bruto: string): string {
  const d = soDigitos(bruto).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/**
 * Máscara progressiva do telefone, para uso enquanto se digita.
 *
 * Mesma regra do CPF: nunca termina em separador, senão o backspace apaga
 * o caractere, a máscara o recoloca e o campo trava.
 *
 * O traço muda de lugar entre o 10º e o 11º dígito — fixo e celular têm
 * formatos diferentes, e até o 11º não dá para saber qual é. O pulo é o
 * comportamento que todo formulário brasileiro tem, então não estranha.
 */
export function mascaraTelefone(bruto: string): string {
  let d = soDigitos(bruto);

  // Colar do WhatsApp traz o +55 na frente. Só tiramos quando sobra número
  // demais para ser nacional: o DDD 55 existe (Santa Maria), e um
  // (55) 99999-0000 legítimo tem 11 dígitos e precisa passar intacto.
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2);

  d = d.slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function cpf(v: string | null | undefined): string {
  const d = soDigitos(v ?? "");
  if (d.length !== 11) return v ?? "";
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
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

/** Dias inteiros decorridos desde um instante. */
export function diasDesde(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
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
