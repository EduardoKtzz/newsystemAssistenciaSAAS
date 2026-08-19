"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigirLoja } from "@/lib/sessao-loja";
import { supabaseServidor } from "@/lib/supabase/server";
import { cpfValido, soDigitos } from "@/lib/format";

/**
 * O erro volta acompanhado do que a pessoa digitou.
 *
 * O React 19 dá reset no formulário assim que a ação do servidor
 * responde. Sem devolver os valores, um CPF com um dígito trocado apaga
 * nome, aparelho, defeito e prazo — e o atendente redigita tudo com o
 * cliente esperando no balcão.
 */
export type EstadoForm = { erro?: string; valores?: Record<string, string> };

/**
 * Abre uma OS a partir do balcão.
 *
 * Cliente e aparelho são reaproveitados quando já existem — o telefone
 * identifica a pessoa, o IMEI identifica o aparelho. É isso que faz a
 * segunda visita do mesmo cliente cair no mesmo histórico em vez de criar
 * um cadastro paralelo, e é o que sustenta a pergunta "esse aparelho já
 * passou aqui?".
 */
export async function abrirOs(
  _anterior: EstadoForm,
  dados: FormData,
): Promise<EstadoForm> {
  const { loja } = await exigirLoja();
  const supabase = await supabaseServidor();

  // Tudo que veio do formulário volta junto com qualquer erro. Montado uma
  // vez aqui para nenhum `return` novo esquecer de devolver os campos.
  const valores = Object.fromEntries(
    [...dados.entries()].filter(([, v]) => typeof v === "string"),
  ) as Record<string, string>;
  const falha = (erro: string): EstadoForm => ({ erro, valores });

  const nome = String(dados.get("cliente_nome") ?? "").trim();
  const fone = soDigitos(String(dados.get("cliente_telefone") ?? ""));
  const email = String(dados.get("cliente_email") ?? "").trim();
  const cpf = soDigitos(String(dados.get("cliente_cpf") ?? ""));
  const marca = String(dados.get("marca") ?? "").trim();
  const modelo = String(dados.get("modelo") ?? "").trim();
  const cor = String(dados.get("cor") ?? "").trim();
  const imei = soDigitos(String(dados.get("imei") ?? ""));
  const defeito = String(dados.get("defeito_relatado") ?? "").trim();
  const senha = String(dados.get("senha_aparelho") ?? "").trim();
  const acessorios = String(dados.get("acessorios") ?? "").trim();
  const prazo = String(dados.get("prazo_estimado") ?? "").trim();

  if (nome.length < 2) return falha("Informe o nome do cliente.");
  // 10 dígitos = fixo com DDD. Menos que isso não dá para avisar ninguém, e
  // a confirmação do portal usa os 4 últimos deste número.
  if (fone.length < 10) return falha("Informe o telefone do cliente com DDD.");
  if (!marca || !modelo) return falha("Informe marca e modelo do aparelho.");
  if (defeito.length < 3) return falha("Descreva o problema relatado.");

  // CPF é opcional, mas se veio tem que estar certo: um dígito trocado não
  // dá erro agora e reaparece como um cliente que não consegue entrar no
  // portal semanas depois.
  if (cpf && !cpfValido(cpf)) {
    return falha("O CPF informado não é válido. Confira os números.");
  }

  // Cliente: procura pelo telefone dentro da loja.
  let clienteId: string;
  const { data: achado } = await supabase
    .from("cliente")
    .select("id, documento")
    .eq("telefone", fone)
    .maybeSingle();

  if (achado) {
    clienteId = achado.id;
    // Cadastro antigo sem CPF ganha o CPF agora, e com ele o acesso ao
    // portal por CPF. Um CPF já gravado não é sobrescrito: se os dois
    // diferem, quem decide é o balcão, não um formulário de entrada.
    if (cpf && !achado.documento) {
      await supabase.from("cliente").update({ documento: cpf }).eq("id", clienteId);
    }
  } else {
    const { data, error } = await supabase
      .from("cliente")
      .insert({
        loja_id: loja.id,
        nome,
        telefone: fone,
        email: email || null,
        documento: cpf || null,
      })
      .select("id")
      .single();
    if (error || !data) return falha("Não foi possível salvar o cliente.");
    clienteId = data.id;
  }

  // Aparelho: o IMEI é o identificador de verdade. Sem ele, cada entrada
  // vira um aparelho novo — chutar por marca+modelo juntaria dois iPhone 12
  // diferentes do mesmo dono num cadastro só.
  //
  // A busca é presa ao cliente de propósito. Sem isso, um IMEI que já
  // passou pela loja no nome de outra pessoa — aparelho de segunda mão, ou
  // um dígito errado na digitação — faz a OS nascer grudada no cadastro
  // antigo, e o comprovante sai com marca e modelo de outro aparelho.
  //
  // E o que foi digitado agora vale mais que o cadastro velho: quem está
  // com o aparelho na mão é o atendente. Reaproveitar a linha ignorando o
  // que ele digitou é o mesmo erro, só que silencioso.
  let aparelhoId: string | null = null;
  if (imei) {
    const { data } = await supabase
      .from("aparelho")
      .select("id, marca, modelo")
      .eq("imei", imei)
      .eq("cliente_id", clienteId)
      .maybeSingle();

    if (data) {
      aparelhoId = data.id;
      if (data.marca !== marca || data.modelo !== modelo) {
        await supabase.from("aparelho").update({ marca, modelo }).eq("id", data.id);
      }
    }
  }

  if (!aparelhoId) {
    const { data, error } = await supabase
      .from("aparelho")
      .insert({
        loja_id: loja.id,
        cliente_id: clienteId,
        marca,
        modelo,
        cor: cor || null,
        imei: imei || null,
      })
      .select("id")
      .single();
    if (error || !data) return falha("Não foi possível salvar o aparelho.");
    aparelhoId = data.id;
  }

  const { data: os, error: erroOs } = await supabase
    .from("os")
    .insert({
      loja_id: loja.id,
      cliente_id: clienteId,
      aparelho_id: aparelhoId,
      defeito_relatado: defeito,
      senha_aparelho: senha || null,
      acessorios: acessorios || null,
      prazo_estimado: prazo || null,
      status: "recebido",
    })
    .select("id")
    .single();

  if (erroOs || !os) return falha("Não foi possível abrir a OS.");

  await supabase.from("os_evento").insert({
    os_id: os.id,
    loja_id: loja.id,
    status: "recebido",
    titulo: "Aparelho recebido",
    descricao: defeito,
    autor: "loja",
  });

  revalidatePath("/painel");
  redirect(`/painel/os/${os.id}?novo=1`);
}
