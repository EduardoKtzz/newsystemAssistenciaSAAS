import { redirect } from "next/navigation";

/**
 * A entrada agora mora na home, com CPF e código no mesmo campo.
 *
 * Esta rota continua existindo porque está impressa em comprovante que já
 * saiu da loja — papel no bolso do cliente não recebe atualização.
 */
export default function EntradaAntiga() {
  redirect("/");
}
