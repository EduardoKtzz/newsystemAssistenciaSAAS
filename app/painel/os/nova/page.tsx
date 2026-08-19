import Link from "next/link";
import { FormularioNovaOs } from "./formulario";

export default function NovaOs() {
  return (
    <>
      <div className="mb-6">
        <Link href="/painel" className="text-sm text-slate-500 escuro:text-slate-400 hover:text-marca-700 escuro:hover:text-marca-300">
          ← Voltar para a lista
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 escuro:text-slate-100">
          Nova ordem de serviço
        </h1>
        <p className="mt-1 text-sm text-slate-500 escuro:text-slate-400">
          Cliente e aparelho já cadastrados são reaproveitados pelo telefone e pelo IMEI.
        </p>
      </div>

      <FormularioNovaOs />
    </>
  );
}
