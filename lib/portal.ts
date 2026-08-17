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
const LIMITE_TENTATIVAS = 8;

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
 * Confere CPF + os 4 últimos dígitos do telefone e devolve os cadastros
 * que batem.
 *
 * São vários porque `cliente` é por loja: a mesma pessoa atendida em duas
 * assistências tem dois cadastros, e ela tem direito de ver os dois.
 *
 * O segundo fator continua sendo o telefone, e não só o CPF, porque no
 * Brasil o CPF de alguém não é segredo — vaza em cadastro de farmácia, em
 * lista de condomínio, em qualquer lugar. Sozinho ele identifica, mas não
 * autentica.
 */
export async function conferirPorCpf(
  cpfBruto: string,
  quatroDigitos: string,
): Promise<
  { ok: true; clienteIds: string[] } | { ok: false; motivo: "nao_encontrado" | "bloqueado" }
> {
  const admin = supabaseAdmin();
  const cpf = soDigitos(cpfBruto);
  const digitos = soDigitos(quatroDigitos);

  if (cpf.length !== 11 || digitos.length !== 4) {
    return { ok: false, motivo: "nao_encontrado" };
  }

  const { data: cadastros } = await admin
    .from("cliente")
    .select("id, telefone, tentativas_portal")
    .eq("documento", cpf);

  if (!cadastros?.length) return { ok: false, motivo: "nao_encontrado" };

  if (cadastros.some((c) => (c.tentativas_portal ?? 0) >= LIMITE_TENTATIVAS)) {
    return { ok: false, motivo: "bloqueado" };
  }

  const certos = cadastros.filter((c) => soDigitos(c.telefone).slice(-4) === digitos);

  if (!certos.length) {
    // Erro no telefone conta contra todos os cadastros daquele CPF: são a
    // mesma pessoa, e contar em um só deixaria o limite ser burlado
    // alternando entre as lojas.
    await Promise.all(
      cadastros.map((c) =>
        admin
          .from("cliente")
          .update({ tentativas_portal: (c.tentativas_portal ?? 0) + 1 })
          .eq("id", c.id),
      ),
    );
    return { ok: false, motivo: "nao_encontrado" };
  }

  await Promise.all(
    certos.map((c) => admin.from("cliente").update({ tentativas_portal: 0 }).eq("id", c.id)),
  );

  return { ok: true, clienteIds: certos.map((c) => c.id) };
}

export type ResumoOs = {
  codigo: string;
  numero: number;
  status: Os["status"];
  aparelho: string;
  loja: string;
  criado_em: string;
  prazo_estimado: string | null;
  valor: number | null;
};

/** As OS dos cadastros liberados, da mais recente para a mais antiga. */
export async function buscarOsDosClientes(clienteIds: string[]): Promise<ResumoOs[]> {
  if (!clienteIds.length) return [];
  const admin = supabaseAdmin();

  const { data } = await admin
    .from("os")
    .select(
      "codigo, numero, status, criado_em, prazo_estimado, valor_final, valor_orcado, " +
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
    valor_final: number | null;
    valor_orcado: number | null;
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
    valor: l.valor_final ?? l.valor_orcado,
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
