/**
 * Lê as variáveis do Supabase e falha com uma mensagem que diz o que fazer.
 *
 * Sem isto, quem esquece de preencher o `.env.local` recebe "Your project's
 * URL and Key are required to create a Supabase client!" apontando para uma
 * linha do `proxy.ts` — uma mensagem que descreve o sintoma e esconde a
 * causa. O erro acontece de qualquer jeito; o que muda é o tempo até
 * entender que o problema é um arquivo de configuração vazio.
 *
 * A checagem do `xxxx` existe porque o modelo em `.env.local.example` traz
 * uma URL de mentira. Copiar o arquivo e preencher só metade dele é o
 * caminho normal, e uma URL de placeholder falha lá adiante com erro de
 * rede, mais longe ainda da causa.
 */
export function configSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !chave || url.includes("xxxx")) {
    throw new Error(
      "Supabase não configurado. Preencha NEXT_PUBLIC_SUPABASE_URL e " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY no arquivo .env.local (veja " +
        ".env.local.example) e reinicie o servidor. As chaves estão no painel " +
        "do Supabase em Project Settings → API Keys.",
    );
  }

  return { url, chave };
}
