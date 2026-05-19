/**
 * Estados derivados sin columnas de workflow en dbo.productos.
 * Limitación: `disponible = 'no'` no distingue pendiente vs no aprobado (rechazo).
 */

export type DerivedProductStatus =
  | "pending_review"
  | "approved"
  | "scheduled"
  | "sold";

export type ProductAvailabilityFlags = {
  disponible: string | null;
  isScheduled: boolean;
  isSold: boolean;
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
  return "pending_review";
}

/** UI label when rejection cannot be distinguished from pending. */
export function derivedStatusLabel(status: DerivedProductStatus): string {
  switch (status) {
    case "pending_review":
      return "Pendiente de revisión";
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
