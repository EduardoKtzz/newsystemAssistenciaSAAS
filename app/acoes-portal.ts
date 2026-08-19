"use server";

import { redirect } from "next/navigation";
import { buscarClientesPorCpf, buscarOsDosClientes } from "@/lib/portal";
import { liberarClientes } from "@/lib/portal-sessao";
import { cpfValido, soDigitos } from "@/lib/format";

export type EstadoEntrada = { erro?: string };

/**
 * A porta do cliente: só o CPF.
 *
 * O CPF abre a camada de status — onde o aparelho está e para quando. É a
 * resposta que a atendente daria por telefone sem pensar duas vezes, e é
 * o que a pessoa veio buscar. Pedir mais que isso para responder "já está
 * pronto?" é burocracia.
 *
 * O que o CPF NÃO abre: valor, diagnóstico, conversa e o botão de aprovar
 * o orçamento. Essa parte fica atrás dos 4 últimos dígitos do telefone,
 * confirmados dentro da própria OS.
 */
export async function entrarNoPortal(
  _anterior: EstadoEntrada,
  dados: FormData,
): Promise<EstadoEntrada> {
  const cpf = soDigitos(String(dados.get("cpf") ?? ""));

  if (!cpf) return { erro: "Digite seu CPF." };
  if (!cpfValido(cpf)) {
    return { erro: "Esse CPF não parece válido. Confira os números." };
  }

  const ids = await buscarClientesPorCpf(cpf);
  if (!ids.length) {
    return {
      erro:
        "Não encontramos nenhum conserto com esse CPF. Confira o número, ou use o " +
        "código do comprovante que a loja te entregou.",
    };
  }

  await liberarClientes(ids);

  // Uma OS só é o caso comum. Mandar a pessoa para uma lista de um item
  // seria um clique cobrado por nada.
  const lista = await buscarOsDosClientes(ids);
  redirect(lista.length === 1 ? `/os/${lista[0].codigo}` : "/os/minhas");
}
