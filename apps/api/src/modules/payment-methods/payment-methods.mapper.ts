import type { MedioPagoRow } from "./payment-methods.repository";

export type PaymentMethodPublic = {
  id: number;
  type: string;
  status: string;
  currency: string;
  holder: string;
  entity: string | null;
  lastDigits: string | null;
  aliasOrCbu: string | null;
  guaranteeAmount: number | null;
  availableAmount: number | null;
  rejectionReason: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function toIso(d: Date | null | undefined): string | null {
  if (!d) {
    return null;
  }
  return d instanceof Date ? d.toISOString() : new Date(d).toISOString();
}

function toNumber(v: number | null | undefined): number | null {
  if (v === null || v === undefined) {
    return null;
  }
  return Number(v);
}

export function mapMedioPagoToPublic(row: MedioPagoRow): PaymentMethodPublic {
  return {
    id: row.identificador,
    type: row.tipo,
    status: row.estado,
    currency: row.moneda,
    holder: row.titular,
    entity: row.entidad,
    lastDigits: row.ultimosDigitos,
    aliasOrCbu: row.aliasOCbu,
    guaranteeAmount: toNumber(row.montoGarantia),
    availableAmount: toNumber(row.montoDisponible),
    rejectionReason: row.motivoRechazo,
    verifiedAt: toIso(row.verificadoEn),
    createdAt: toIso(row.creadoEn) ?? "",
    updatedAt: toIso(row.actualizadoEn) ?? "",
  };
}
