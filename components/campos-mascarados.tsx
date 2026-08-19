"use client";

import { useState } from "react";
import { cpfValido, mascaraCpf, mascaraTelefone, soDigitos } from "@/lib/format";

type Props = Omit<React.ComponentProps<"input">, "value" | "onChange" | "type"> & {
  /** Valor de partida, usado para devolver o que foi digitado após um erro. */
  defaultValue?: string;
  /** Cor do aviso. O padrão serve no painel; no escuro passe text-rose-300. */
  classeAviso?: string;
};

/**
 * A base dos campos com máscara.
 *
 * Ser controlado resolve dois problemas de uma vez. O primeiro é a
 * máscara. O segundo é menos óbvio: o React 19 dá reset no formulário
 * depois que a ação do servidor volta, e campo controlado não perde o
 * valor nesse reset porque quem manda nele é o estado, não o DOM.
 */
function CampoMascarado({
  formatar,
  aviso,
  classeAviso = "text-rose-600",
  className = "campo",
  defaultValue = "",
  ...props
}: Props & {
  formatar: (v: string) => string;
  aviso?: (digitos: string) => string | null;
}) {
  const [valor, setValor] = useState(() => formatar(defaultValue));
  const problema = aviso?.(soDigitos(valor)) ?? null;

  return (
    <>
      <input
        {...props}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        className={className}
        value={valor}
        onChange={(e) => setValor(formatar(e.target.value))}
        aria-invalid={problema ? true : undefined}
      />
      {problema && <p className={`mt-2 text-xs ${classeAviso}`}>{problema}</p>}
    </>
  );
}

/**
 * CPF com pontuação automática.
 *
 * O aviso só aparece com os 11 dígitos preenchidos — antes disso todo CPF
 * está incompleto, e alertar a cada tecla treina a pessoa a ignorar o
 * aviso justamente quando ele passa a valer.
 */
export function CampoCpf(props: Props) {
  return (
    <CampoMascarado
      {...props}
      maxLength={14}
      formatar={mascaraCpf}
      aviso={(d) =>
        d.length === 11 && !cpfValido(d)
          ? "Esse CPF não fecha a conta dos dígitos verificadores. Confira os números."
          : null
      }
    />
  );
}

/**
 * Telefone brasileiro com DDD.
 *
 * Cobra 10 ou 11 dígitos porque os 4 últimos são a confirmação do cliente
 * no portal — número truncado no cadastro vira cliente trancado do lado
 * de fora, e ninguém descobre isso no balcão, só semanas depois.
 */
export function CampoTelefone(props: Props) {
  return (
    <CampoMascarado
      {...props}
      inputMode="tel"
      maxLength={15}
      formatar={mascaraTelefone}
      aviso={(d) =>
        d.length > 0 && d.length < 10
          ? "Faltam dígitos. Informe DDD e número completo."
          : null
      }
    />
  );
}
