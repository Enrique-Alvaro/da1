/**
 * Estados derivados sin columnas de workflow en dbo.productos.
 * Limitación: `disponible = 'no'` no distingue pendiente vs no aprobado (rechazo).
 */

export type DerivedProductStatus =
  | "pending_review"
  | "rejected"
  | "approved"
  | "scheduled"
  | "sold";

export type ProductAvailabilityFlags = {
  disponible: string | null;
  isScheduled: boolean;
  isSold: boolean;
  motivoRechazo?: string | null;
};

export function deriveProductStatus(flags: ProductAvailabilityFlags): DerivedProductStatus {
  if (flags.isSold) {
    return "sold";
  }
  if (flags.isScheduled) {
    return "scheduled";
  }
  const avail = (flags.disponible ?? "no").trim().toLowerCase();
  if (avail === "si") {
    return "approved";
  }
  if (flags.motivoRechazo?.trim()) {
    return "rejected";
  }
  return "pending_review";
}

/** Etiqueta UI cuando el rechazo no se puede distinguir de pendiente. */
export function derivedStatusLabel(status: DerivedProductStatus): string {
  switch (status) {
    case "pending_review":
      return "Pendiente de revisión";
    case "rejected":
      return "Rechazado";
    case "approved":
      return "Aprobado";
    case "scheduled":
      return "Programado";
    case "sold":
      return "Vendido";
    default:
      return status;
  }
}
