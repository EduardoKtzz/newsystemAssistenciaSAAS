"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { buscarOsPublica, conferirAcesso } from "@/lib/portal";
import { liberarAcesso, temAcesso } from "@/lib/portal-sessao";

export type EstadoForm = { erro?: string };

export async function confirmar(
  _anterior: EstadoForm,
  dados: FormData,
): Promise<EstadoForm> {
  const codigo = String(dados.get("codigo") ?? "");
  const digitos = String(dados.get("digitos") ?? "");

  const r = await conferirAcesso(codigo, digitos);

  if (!r.ok) {
    // A mesma frase para código inexistente e telefone errado. Distinguir
    // os dois casos entregaria de graça a resposta "esse código existe" a
    // quem estiver testando códigos no chute.
    if (r.motivo === "bloqueada") {
      return {
        erro:
          "Muitas tentativas nesta consulta. Entre em contato com a loja pelo telefone " +
          "para liberar o acesso.",
      };
    }
    return { erro: "Código ou telefone não confere. Confira o comprovante da loja." };
  }

  await liberarAcesso(codigo);
  revalidatePath(`/os/${codigo.toUpperCase()}`);
  redirect(`/os/${codigo.toUpperCase()}`);
}

/**
 * Toda ação do cliente reconfere o cookie antes de tocar no banco.
 *
 * Sem isso, bastaria descobrir um código para aprovar orçamento alheio: a
 * ação é um endpoint HTTP como qualquer outro, e ninguém precisa passar
 * pela tela de confirmação para chamá-la.
 */
async function exigirCliente(codigo: string) {
  if (!(await temAcesso(codigo))) redirect(`/os/${codigo.toUpperCase()}`);
  const os = await buscarOsPublica(codigo);
  if (!os) redirect("/os");
  return os;
}

/**
 * A decisão do cliente sobre o orçamento.
 *
 * Só vale quando a OS está em `orcamento_enviado`. Sem essa checagem, um
 * cliente com a aba antiga aberta poderia "aprovar" um serviço que já está
 * em reparo, ou reprovar o que ele mesmo já aprovou — e o carimbo de
 * aprovação é justamente a prova que a loja vai usar numa discussão.
 */
export async function decidirOrcamento(dados: FormData) {
  const codigo = String(dados.get("codigo") ?? "");
  const decisao = String(dados.get("decisao") ?? "");
  const os = await exigirCliente(codigo);

  if (os.status !== "orcamento_enviado") return;
  if (decisao !== "aprovar" && decisao !== "recusar") return;

  const aprovou = decisao === "aprovar";
  const agora = new Date().toISOString();
  const admin = supabaseAdmin();

  await admin
    .from("os")
    .update(
      aprovou
        ? { status: "aprovado", aprovado_em: agora }
        : { status: "recusado", recusado_em: agora },
    )
    .eq("id", os.id);

  await admin.from("os_evento").insert({
    os_id: os.id,
    loja_id: os.loja_id,
    status: aprovou ? "aprovado" : "recusado",
    titulo: aprovou ? "Orçamento aprovado pelo cliente" : "Orçamento recusado pelo cliente",
    descricao: aprovou
      ? `Serviço autorizado no valor de R$ ${Number(os.valor_orcado ?? 0).toFixed(2)}.`
      : "O cliente optou por não realizar o serviço.",
    autor: "cliente",
  });

  revalidatePath(`/os/${codigo.toUpperCase()}`);
  revalidatePath("/painel");
}

export async function mandarMensagem(dados: FormData) {
  const codigo = String(dados.get("codigo") ?? "");
  const texto = String(dados.get("texto") ?? "").trim();
  if (!texto) return;

  const os = await exigirCliente(codigo);
  const admin = supabaseAdmin();

  await admin.from("mensagem").insert({
    os_id: os.id,
    loja_id: os.loja_id,
    autor: "cliente",
    texto: texto.slice(0, 2000),
    lida: false,
  });

  revalidatePath(`/os/${codigo.toUpperCase()}`);
  revalidatePath("/painel");
}
