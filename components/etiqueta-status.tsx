import { STATUS, type OsStatus } from "@/lib/status";

export function EtiquetaStatus({
  status,
  publico = false,
}: {
  status: OsStatus;
  /** No portal usamos o rótulo escrito para o cliente, não o jargão da loja. */
  publico?: boolean;
}) {
  const info = STATUS[status];
  return (
    <span className={`etiqueta ${info.cor}`}>
      {publico ? info.publico : info.label}
    </span>
  );
}
