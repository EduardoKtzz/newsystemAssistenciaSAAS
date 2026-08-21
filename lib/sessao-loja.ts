import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { supabaseServidor } from "./supabase/server";
import type { Loja } from "./types";

/**
 * Usuário logado + loja dele. Toda página do painel começa por aqui.
 *
 * Redireciona em vez de devolver `null` porque nenhuma tela do painel tem
 * o que mostrar sem loja — deixar cada uma decidir seria repetir o mesmo
 * `if` em todo arquivo, com o risco de esquecer em um deles.
 *
 * ------------------------------------------------------------------------
 * O `cache()` não é enfeite: era metade do tempo de tela do painel.
 *
 * Layout e página são dois arquivos, e cada um chamava esta função por
 * conta própria — logo, duas validações de token no servidor do Supabase e
 * duas leituras de `loja_usuario` por navegação. Com o banco numa região
 * longe do Brasil, cada uma dessas voltas custa ~350ms, então a duplicata
 * sozinha somava ~0,7s a cada clique dentro do painel.
 *
 * `cache()` do React memoriza pelo tempo de UMA requisição: o layout paga,
 * a página recebe pronto, e nada é compartilhado entre usuários nem entre
 * requisições — o que aqui importa, já que o retorno carrega a sessão.
 *
 * Vale para as Server Actions também: cada ação é a sua própria requisição,
 * com o seu próprio cache. Uma ação nunca enxerga a sessão de outra.
 * ------------------------------------------------------------------------
 */
export const exigirLoja = cache(async (): Promise<{
  userId: string;
  email: string;
  nome: string;
  papel: string;
  loja: Loja;
}> => {
  const supabase = await supabaseServidor();

  /*
    Duas perguntas diferentes, e as duas precisam ser feitas.

    1) getClaims() confere assinatura e validade do token SEM ir à rede
       (o projeto assina em ES256). Ele não prova que a sessão ainda existe
       — prova só que o token é autêntico. Serve para uma coisa aqui: saber
       o user_id imediatamente, para a consulta ao vínculo poder sair antes
       da resposta do servidor de Auth.

    2) getUser() é a autoridade. Ele pergunta ao Supabase se a sessão
       continua viva, e é o único que enxerga "Sair", troca de senha, conta
       banida ou apagada. Nada disso mexe no token que já está no navegador,
       então sem esta pergunta um cookie copiado continuaria abrindo o
       painel até vencer sozinho — até uma hora depois do corte.

    As duas idas que sobram saem JUNTAS, e é isso que devolve a velocidade
    sem custar segurança: a consulta ao vínculo não espera o getUser porque
    quem a recorta é a RLS, não este código, e o resultado dela só é usado
    depois que o getUser volta dizendo que a sessão vale.
  */
  // O try existe porque getClaims() NÃO devolve { error } para tudo: com um
  // cookie corrompido — header ilegível, "alg" que não é string — ele lança
  // exceção crua. Em /painel isso nunca aparecia, porque o proxy barra antes;
  // mas /comprovante/[id] chama esta função direto, fora do matcher, e um
  // cookie envenenado derrubava a página com 500 em vez de mandar para o
  // login. Token que não dá nem para ler é token que não vale: cai no
  // redirect, como qualquer sessão inválida.
  //
  // O redirect fica FORA do try de propósito — ele funciona lançando uma
  // exceção própria, e um catch em volta engoliria o redirecionamento.
  let sub: string | undefined;
  try {
    const { data: verificado } = await supabase.auth.getClaims();
    sub = verificado?.claims?.sub;
  } catch {
    sub = undefined;
  }
  if (!sub) redirect("/entrar");

  const [
    {
      data: { user },
    },
    { data: vinculo },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("loja_usuario")
      .select("nome, papel, loja:loja_id(*)")
      .eq("user_id", sub)
      .single(),
  ]);

  // A ordem importa: sessão morta é recusada ANTES de o vínculo ser lido.
  if (!user) redirect("/entrar");

  // Usuário autenticado mas sem loja: cadastro pela metade. Manda concluir
  // em vez de estourar erro numa tela em branco.
  if (!vinculo?.loja) redirect("/comecar");

  const email = user.email ?? "";

  return {
    userId: user.id,
    email,
    nome: vinculo.nome ?? email,
    papel: vinculo.papel,
    loja: vinculo.loja as unknown as Loja,
  };
});
