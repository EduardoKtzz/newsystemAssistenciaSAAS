import type { OsStatus } from "./status";

/** Espelho em TypeScript do esquema em `supabase/schema.sql`. */

export type PagamentoStatus = "pendente" | "sinal" | "pago";
export type AutorTipo = "loja" | "cliente" | "sistema";

export type Loja = {
  id: string;
  nome: string;
  telefone: string | null;
  whatsapp: string | null;
  endereco: string | null;
  garantia_dias: number;
  criado_em: string;
};

export type Cliente = {
  id: string;
  loja_id: string;
  nome: string;
  telefone: string;
  email: string | null;
  documento: string | null;
  observacao: string | null;
  criado_em: string;
};

export type Aparelho = {
  id: string;
  loja_id: string;
  cliente_id: string;
  marca: string;
  modelo: string;
  cor: string | null;
  imei: string | null;
  criado_em: string;
};

export type Os = {
  id: string;
  loja_id: string;
  numero: number;
  codigo: string;
  cliente_id: string;
  aparelho_id: string;
  status: OsStatus;
  defeito_relatado: string;
  diagnostico: string | null;
  senha_aparelho: string | null;
  acessorios: string | null;
  observacoes: string | null;
  prazo_estimado: string | null;
  valor_orcado: number | null;
  valor_final: number | null;
  valor_sinal: number;
  pagamento: PagamentoStatus;
  orcamento_enviado_em: string | null;
  aprovado_em: string | null;
  recusado_em: string | null;
  entregue_em: string | null;
  garantia_ate: string | null;
  tentativas_portal: number;
  criado_em: string;
  atualizado_em: string;
};

export type OsItem = {
  id: string;
  os_id: string;
  loja_id: string;
  descricao: string;
  tipo: "peca" | "servico";
  quantidade: number;
  valor_unitario: number;
  criado_em: string;
};

export type OsEvento = {
  id: string;
  os_id: string;
  loja_id: string;
  status: OsStatus | null;
  titulo: string;
  descricao: string | null;
  autor: AutorTipo;
  publico: boolean;
  criado_em: string;
};

export type Mensagem = {
  id: string;
  os_id: string;
  loja_id: string;
  autor: AutorTipo;
  texto: string;
  lida: boolean;
  criado_em: string;
};

/** OS com cliente e aparelho embutidos — o formato que as telas consomem. */
export type OsCompleta = Os & {
  cliente: Cliente;
  aparelho: Aparelho;
};

export function somaItens(itens: Pick<OsItem, "quantidade" | "valor_unitario">[]): number {
  return itens.reduce((t, i) => t + i.quantidade * Number(i.valor_unitario), 0);
}
