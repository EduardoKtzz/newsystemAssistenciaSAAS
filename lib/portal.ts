import "server-only";
import { supabaseAdmin } from "./supabase/admin";
import { soDigitos } from "./format";
import type { Loja, Mensagem, Os, OsEvento, OsItem } from "./types";

/**
 * Toda leitura e escrita do portal do cliente passa por aqui.
 *
 * O cliente não tem sessão no Supabase, então estas funções usam a
 * service_role e a RLS não protege nada. A proteção é este arquivo: ele é
 * o único lugar que fala com o banco em nome do cliente, filtra sempre por
 * código, e monta na mão o objeto devolvido.
 *
 * Nada de `select("*")` na OS. Os campos são listados um a um porque a
 * tabela tem coisa que o cliente não pode ver — `senha_aparelho` acima de
 * tudo. Com `*`, o dia em que alguém adicionar uma coluna de custo interno
 * ou observação da bancada, ela vaza sozinha para a tela do cliente. A
 * lista explícita transforma esse vazamento em uma decisão consciente.
 */

const CAMPOS_PUBLICOS =
  "id, numero, codigo, loja_id, cliente_id, status, defeito_relatado, diagnostico, " +
  "prazo_estimado, valor_orcado, valor_final, valor_sinal, pagamento, " +
  "orcamento_enviado_em, aprovado_em, recusado_em, entregue_em, garantia_ate, " +
  "criado_em, atualizado_em";

export type OsPublica = Pick<
  Os,
  | "id"
  | "numero"
  | "codigo"
  | "loja_id"
  | "cliente_id"
  | "status"
  | "defeito_relatado"
  | "diagnostico"
  | "prazo_estimado"
  | "valor_orcado"
  | "valor_final"
  | "valor_sinal"
  | "pagamento"
  | "orcamento_enviado_em"
  | "aprovado_em"
  | "recusado_em"
  | "entregue_em"
  | "garantia_ate"
  | "criado_em"
  | "atualizado_em"
> & {
  cliente_nome: string;
  aparelho: string;
  loja: Pick<Loja, "nome" | "telefone" | "whatsapp" | "endereco" | "garantia_dias">;
};

/** Quantos palpites de telefone aceitamos antes de travar a OS. */
export const LIMITE_TENTATIVAS = 8;

type Resultado =
  | { ok: true }
  | { ok: false; motivo: "nao_encontrada" | "telefone_errado" | "bloqueada" };

/**
 * Confere código + os 4 últimos dígitos do telefone.
 *
 * O contador de tentativas existe porque, uma vez que alguém tenha um
 * código válido em mãos, restam só 10 mil combinações de 4 dígitos — poucos
 * minutos de script. Oito palpites bastam para quem erra digitando e são
 * inúteis para quem está adivinhando.
 */
export async function conferirAcesso(
  codigo: string,
  quatroDigitos: string,
): Promise<Resultado> {
  const admin = supabaseAdmin();
  const cod = codigo.trim().toUpperCase();
  const digitos = soDigitos(quatroDigitos);

  const { data: os } = await admin
    .from("os")
    .select("id, tentativas_portal, cliente:cliente_id(telefone)")
    .eq("codigo", cod)
    .maybeSingle();

  if (!os) return { ok: false, motivo: "nao_encontrada" };
  if ((os.tentativas_portal ?? 0) >= LIMITE_TENTATIVAS) {
    return { ok: false, motivo: "bloqueada" };
  }

  const telefone = (os.cliente as unknown as { telefone: string }).telefone;
  const acertou = digitos.length === 4 && soDigitos(telefone).slice(-4) === digitos;

  if (!acertou) {
    await admin
      .from("os")
      .update({ tentativas_portal: (os.tentativas_portal ?? 0) + 1 })
      .eq("id", os.id);
    return { ok: false, motivo: "telefone_errado" };
  }

  await admin.from("os").update({ tentativas_portal: 0 }).eq("id", os.id);
  return { ok: true };
}

/**
 * O `select` é montado por concatenação, então o supabase-js não consegue
 * inferir a forma do retorno (ele lê a string literal em tempo de tipo).
 * Este é o formato que a consulta realmente devolve.
 */
type LinhaOs = Omit<OsPublica, "cliente_nome" | "aparelho" | "loja"> & {
  cliente: { nome: string };
  aparelho: { marca: string; modelo: string; cor: string | null };
  loja: OsPublica["loja"];
};

export async function buscarOsPublica(codigo: string): Promise<OsPublica | null> {
  const admin = supabaseAdmin();

  const { data } = await admin
    .from("os")
    .select(
      `${CAMPOS_PUBLICOS}, cliente:cliente_id(nome), aparelho:aparelho_id(marca, modelo, cor), ` +
        `loja:loja_id(nome, telefone, whatsapp, endereco, garantia_dias)`,
    )
    .eq("codigo", codigo.trim().toUpperCase())
    .maybeSingle();

  if (!data) return null;
  const linha = data as unknown as LinhaOs;

  return {
    ...linha,
    // Só o primeiro nome. A tela costuma ser aberta do computador de outra
    // pessoa, e não há motivo para o nome completo ficar exposto ali.
    cliente_nome: linha.cliente.nome.split(" ")[0],
    aparelho: [linha.aparelho.marca, linha.aparelho.modelo, linha.aparelho.cor]
      .filter(Boolean)
      .join(" "),
    loja: linha.loja,
  };
}

/** Só eventos marcados como públicos — anotação interna da bancada fica fora. */
export async function buscarLinhaDoTempo(osId: string): Promise<OsEvento[]> {
  const admin = supabaseAdmin();
  const { data } = await admin
    .from("os_evento")
    .select("*")
    .eq("os_id", osId)
    .eq("publico", true)
    .order("criado_em", { ascending: false });
  return (data ?? []) as OsEvento[];
}

export async function buscarItens(osId: string): Promise<OsItem[]> {
  const admin = supabaseAdmin();
  const { data } = await admin
    .from("os_item")
    .select("*")
    .eq("os_id", osId)
    .order("criado_em");
  return (data ?? []) as OsItem[];
}

/* -------------------------------------------------------------------
   Entrada por CPF
------------------------------------------------------------------- */

/**
 * Quem são os cadastros deste CPF.
 *
 * Sem segundo fator: o CPF sozinho abre a CAMADA DE STATUS — onde o
 * aparelho está e para quando. Nada de valor, diagnóstico ou conversa.
 *
 * A régua é essa: status é o que o cliente perguntaria por telefone e a
 * atendente responderia sem pestanejar. O resto (quanto custa, o que o
 * técnico achou, o que foi conversado, e principalmente aprovar o
 * serviço) exige confirmar os 4 últimos dígitos do telefone.
 *
 * São vários cadastros porque `cliente` é por loja: a mesma pessoa
 * atendida em duas assistências tem dois, e vê os dois.
 */
export async function buscarClientesPorCpf(cpfBruto: string): Promise<string[]> {
  const cpf = soDigitos(cpfBruto);
  if (cpf.length !== 11) return [];

  const admin = supabaseAdmin();
  const { data } = await admin.from("cliente").select("id").eq("documento", cpf);
  return (data ?? []).map((c) => c.id);
}

export type ResumoOs = {
  codigo: string;
  numero: number;
  status: Os["status"];
  aparelho: string;
  loja: string;
  criado_em: string;
  prazo_estimado: string | null;
};

/**
 * As OS dos cadastros liberados, da mais recente para a mais antiga.
 *
 * Sem valores: esta lista é alcançada só com o CPF, e preço faz parte da
 * camada que pede confirmação do telefone.
 */
export async function buscarOsDosClientes(clienteIds: string[]): Promise<ResumoOs[]> {
  if (!clienteIds.length) return [];
  const admin = supabaseAdmin();

  const { data } = await admin
    .from("os")
    .select(
      "codigo, numero, status, criado_em, prazo_estimado, " +
        "aparelho:aparelho_id(marca, modelo), loja:loja_id(nome)",
    )
    .in("cliente_id", clienteIds)
    .order("criado_em", { ascending: false });

  type Linha = {
    codigo: string;
    numero: number;
    status: Os["status"];
    criado_em: string;
    prazo_estimado: string | null;
    aparelho: { marca: string; modelo: string };
    loja: { nome: string };
  };

  return ((data ?? []) as unknown as Linha[]).map((l) => ({
    codigo: l.codigo,
    numero: l.numero,
    status: l.status,
    aparelho: `${l.aparelho.marca} ${l.aparelho.modelo}`,
    loja: l.loja.nome,
    criado_em: l.criado_em,
    prazo_estimado: l.prazo_estimado,
  }));
}

export async function buscarMensagens(osId: string): Promise<Mensagem[]> {
  const admin = supabaseAdmin();
  const { data } = await admin
    .from("mensagem")
    .select("*")
    .eq("os_id", osId)
    .order("criado_em");
  return (data ?? []) as Mensagem[];
}
