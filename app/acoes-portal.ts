"use server";

import { redirect } from "next/navigation";
import { conferirAcesso, conferirPorCpf, buscarOsDosClientes } from "@/lib/portal";
import { liberarAcesso, liberarClientes } from "@/lib/portal-sessao";
import { cpfValido, soDigitos } from "@/lib/format";

export type EstadoEntrada = { erro?: string };

/**
 * A porta única do cliente: um campo que aceita CPF ou código da OS.
 *
 * São dois caminhos porque cobrem dois momentos. Quem acabou de sair da
 * loja tem o papel na mão e digita o código. Quem perdeu o papel — que é
 * a maioria depois de duas semanas — tem o CPF na cabeça.
 *
 * Perguntar "você tem o código ou o CPF?" numa tela anterior seria uma
 * escolha a mais para alguém que só quer saber do celular. O formato do
 * que foi digitado já responde isso sozinho.
 */
export async function entrarNoPortal(
  _anterior: EstadoEntrada,
  dados: FormData,
): Promise<EstadoEntrada> {
  const bruto = String(dados.get("identificador") ?? "").trim();
  const digitos = soDigitos(String(dados.get("digitos") ?? ""));

  if (!bruto) return { erro: "Digite seu CPF ou o código do comprovante." };
  if (digitos.length !== 4) {
    return { erro: "Digite os 4 últimos dígitos do seu telefone." };
  }

  const numeros = soDigitos(bruto);
  let destino: string;

  if (numeros.length === 11) {
    // ---------- caminho do CPF ----------
    if (!cpfValido(numeros)) {
      return { erro: "Esse CPF não parece válido. Confira os números." };
    }

    const r = await conferirPorCpf(numeros, digitos);
    if (!r.ok) {
      if (r.motivo === "bloqueado") {
        return {
          erro:
            "Muitas tentativas para este CPF. Entre em contato com a loja pelo telefone " +
            "para liberar a consulta.",
        };
      }
      return { erro: "Não encontramos nenhum conserto com esse CPF e telefone." };
    }

    await liberarClientes(r.clienteIds);

    // Uma OS só é o caso comum. Mandar a pessoa para uma lista de um item
    // seria um clique cobrado por nada.
    const lista = await buscarOsDosClientes(r.clienteIds);
    if (lista.length === 1) {
      await liberarAcesso(lista[0].codigo);
      destino = `/os/${lista[0].codigo}`;
    } else {
      destino = "/os/minhas";
    }
  } else {
    // ---------- caminho do código ----------
    const codigo = bruto.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const r = await conferirAcesso(codigo, digitos);

    if (!r.ok) {
      if (r.motivo === "bloqueada") {
        return {
          erro:
            "Muitas tentativas nesta consulta. Entre em contato com a loja pelo telefone " +
            "para liberar o acesso.",
        };
      }
      // A mesma frase para código inexistente e telefone errado: separar os
      // dois entregaria "esse código existe" a quem estiver chutando.
      return { erro: "Código ou telefone não confere. Confira o comprovante da loja." };
    }

    await liberarAcesso(codigo);
    destino = `/os/${codigo}`;
  }

  redirect(destino);
}
