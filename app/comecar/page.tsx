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
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-16">
      <div className="cartao p-8">
        <h1 className="text-xl font-bold text-slate-900">Dados da sua loja</h1>
        <p className="mt-1 text-sm text-slate-500">
          É o que aparece para o cliente na tela de acompanhamento.
        </p>
        <FormularioLoja />
      </div>
    </main>
  );
}
