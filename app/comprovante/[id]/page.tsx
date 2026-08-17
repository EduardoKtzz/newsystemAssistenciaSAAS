import { notFound } from "next/navigation";
import { exigirLoja } from "@/lib/sessao-loja";
import { supabaseServidor } from "@/lib/supabase/server";
import { data, dataHora, telefone } from "@/lib/format";
import type { OsCompleta } from "@/lib/types";
import { Imprimir } from "./imprimir";

/**
 * A via que o cliente leva no bolso.
 *
 * É a peça física que faz o portal funcionar: sem o papel com o código, o
 * cliente sem celular não tem como chegar na tela de acompanhamento. Por
 * isso o código vem grande e legível, e não como uma linha a mais no rodapé.
 *
 * Fora do layout do painel de propósito — o cabeçalho com "Nova OS" e "Sair"
 * não pertence a uma folha impressa.
 */
export default async function Comprovante({ params }: PageProps<"/comprovante/[id]">) {
  const { id } = await params;
  const { loja } = await exigirLoja();
  const supabase = await supabaseServidor();

  const { data: bruto } = await supabase
    .from("os")
    .select("*, cliente:cliente_id(*), aparelho:aparelho_id(*)")
    .eq("id", id)
    .maybeSingle();

  if (!bruto) notFound();
  const os = bruto as unknown as OsCompleta;

  const base = process.env.NEXT_PUBLIC_URL_BASE ?? "";

  return (
    <main className="mx-auto max-w-2xl bg-white p-10 print:p-0">
      <Imprimir />

      <div className="flex items-start justify-between border-b border-slate-200 pb-4">
        <div>
          <p className="text-lg font-bold text-slate-900">{loja.nome}</p>
          {loja.endereco && <p className="text-sm text-slate-600">{loja.endereco}</p>}
          {loja.telefone && (
            <p className="text-sm text-slate-600">{telefone(loja.telefone)}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-500">Ordem de serviço</p>
          <p className="text-2xl font-bold text-slate-900">#{os.numero}</p>
          <p className="text-xs text-slate-500">{dataHora(os.criado_em)}</p>
        </div>
      </div>

      <section className="mt-6 grid grid-cols-2 gap-4 text-sm">
        <Linha termo="Cliente" valor={os.cliente.nome} />
        <Linha termo="Telefone" valor={telefone(os.cliente.telefone)} />
        <Linha termo="Aparelho" valor={`${os.aparelho.marca} ${os.aparelho.modelo}`} />
        <Linha termo="Cor" valor={os.aparelho.cor ?? "—"} />
        <Linha termo="IMEI" valor={os.aparelho.imei ?? "não informado"} />
        <Linha termo="Acessórios" valor={os.acessorios ?? "nenhum"} />
      </section>

      <section className="mt-6">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Problema relatado
        </p>
        <p className="mt-1 text-slate-900">{os.defeito_relatado}</p>
      </section>

      {os.prazo_estimado && (
        <p className="mt-4 text-sm text-slate-700">
          Previsão de entrega: <strong>{data(os.prazo_estimado)}</strong>
        </p>
      )}

      <section className="mt-8 rounded-xl border-2 border-dashed border-slate-300 p-6 text-center">
        <p className="text-sm font-medium text-slate-700">
          Acompanhe seu conserto pela internet
        </p>
        <p className="mt-3 text-sm text-slate-600">{base || "seusite.com.br"}</p>
        <p className="codigo-os my-3 text-4xl font-bold text-slate-900">{os.codigo}</p>
        <p className="text-xs text-slate-500">
          Use o código acima {os.cliente.documento ? "ou o seu CPF" : ""} e confirme com os
          4 últimos dígitos do seu telefone ({telefone(os.cliente.telefone).slice(-4)}).
          <br />
          Não precisa criar conta nem instalar aplicativo.
        </p>
        <p className="mt-3 text-xs text-slate-500">
          Pelo site você vê o status, o orçamento, aprova o serviço e fala com a loja —
          de qualquer aparelho, inclusive emprestado.
        </p>
      </section>

      <section className="mt-8 border-t border-slate-200 pt-4 text-xs leading-relaxed text-slate-500">
        <p>
          O serviço só é executado após aprovação do orçamento pelo cliente. Aparelhos não
          retirados em 90 dias após a comunicação de conclusão podem gerar cobrança de
          armazenagem. A garantia de {loja.garantia_dias} dias cobre exclusivamente o serviço
          executado e as peças substituídas, contados da data de entrega, conforme o art. 26
          do Código de Defesa do Consumidor.
        </p>

        <div className="mt-10 grid grid-cols-2 gap-10">
          <div className="border-t border-slate-400 pt-1 text-center">Assinatura do cliente</div>
          <div className="border-t border-slate-400 pt-1 text-center">Assinatura da loja</div>
        </div>
      </section>
    </main>
  );
}

function Linha({ termo, valor }: { termo: string; valor: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{termo}</p>
      <p className="text-slate-900">{valor}</p>
    </div>
  );
}
