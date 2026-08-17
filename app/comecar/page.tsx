import { redirect } from "next/navigation";
import { supabaseServidor } from "@/lib/supabase/server";
import { FormularioLoja } from "./formulario";

export default async function Comecar() {
  const supabase = await supabaseServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: vinculo } = await supabase
    .from("loja_usuario")
    .select("loja_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (vinculo) redirect("/painel");

  return (
    <main className="noite flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-16">
        <h1 className="text-3xl font-bold tracking-tight">
          Dados da <span className="grad-texto">sua loja</span>
        </h1>
        <p className="mt-3 leading-relaxed text-white/55">
          É o que o seu cliente vê na tela de acompanhamento — e o que sai impresso no
          comprovante que ele leva no bolso.
        </p>
        <FormularioLoja />
      </div>
    </main>
  );
}
