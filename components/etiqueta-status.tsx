import { STATUS, type OsStatus } from "@/lib/status";

export function EtiquetaStatus({
  status,
  publico = false,
  escuro = false,
}: {
  status: OsStatus;
  /** No portal usamos o rótulo escrito para o cliente, não o jargão da loja. */
  publico?: boolean;
  /** Telas do cliente são escuras; o painel da loja é claro. */
  escuro?: boolean;
}) {
  const info = STATUS[status];
  return (
    <span className={`etiqueta ${escuro ? info.corNoite : info.cor}`}>
      {publico ? info.publico : info.label}
    </span>
  );
}
