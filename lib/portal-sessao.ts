import "server-only";
import { cookies } from "next/headers";

/**
 * A "sessão" do cliente no portal.
 *
 * O cliente não tem conta. Ele chega com o código impresso na via da OS e
 * confirma os 4 últimos dígitos do próprio telefone. Feito isso, gravamos
 * um cookie assinado para ele não repetir a confirmação a cada visita.
 *
 * O cookie guarda só o código e uma assinatura HMAC. Ele não é um token de
 * acesso genérico: vale para UMA OS, e o servidor ainda vai buscar essa OS
 * pelo código. Alguém que forje o cookie de outra OS precisaria da chave
 * secreta — e mesmo com o cookie certo não alcança nenhuma outra.
 *
 * Por que assinar em vez de só gravar `visto=1`: sem assinatura, qualquer
 * um digita o cookie no navegador e pula a confirmação do telefone, que é
 * a única barreira entre um código adivinhado e os dados do cliente.
 */

const PREFIXO = "fixcell_os_";
const DURACAO = 60 * 60 * 24 * 90; // 90 dias: cobre reparo + garantia

function segredo(): string {
  const s = process.env.PORTAL_SECRET;
  if (!s || s.length < 16) {
    throw new Error(
      "PORTAL_SECRET ausente ou curta demais (mínimo 16 caracteres). " +
        "Gere uma com: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
    );
  }
  return s;
}

async function assinar(codigo: string): Promise<string> {
  const chave = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(segredo()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    chave,
    new TextEncoder().encode(codigo),
  );
  return Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Comparação em tempo constante — evita descobrir a assinatura byte a byte. */
function iguais(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function liberarAcesso(codigo: string): Promise<void> {
  const jar = await cookies();
  jar.set(PREFIXO + codigo.toUpperCase(), await assinar(codigo.toUpperCase()), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURACAO,
  });
}

export async function temAcesso(codigo: string): Promise<boolean> {
  const jar = await cookies();
  const guardado = jar.get(PREFIXO + codigo.toUpperCase())?.value;
  if (!guardado) return false;
  return iguais(guardado, await assinar(codigo.toUpperCase()));
}

export async function revogarAcesso(codigo: string): Promise<void> {
  const jar = await cookies();
  jar.delete(PREFIXO + codigo.toUpperCase());
}
