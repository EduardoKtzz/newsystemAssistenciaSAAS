import { STATUS, type OsStatus } from "@/lib/status";

export function EtiquetaStatus({
  status,
  publico = false,
  escuro = false,
}: {
  status: OsStatus;
  /** No portal usamos o rótulo escrito para o cliente, não o jargão da loja. */
  publico?: boolean;
  /**
   * Telas do cliente são escuras sempre. O painel troca de tema, então lá
   * a etiqueta carrega as duas paletas e deixa o CSS decidir.
   */
  escuro?: boolean;
}) {
  const info = STATUS[status];
  return (
    <span className={`etiqueta ${escuro ? info.corNoite : info.corAdaptavel}`}>
      {publico ? info.publico : info.label}
    </span>
  );
}
