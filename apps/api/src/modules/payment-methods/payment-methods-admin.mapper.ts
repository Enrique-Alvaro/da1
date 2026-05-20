import { mapMedioPagoToPublic, type PaymentMethodPublic } from "./payment-methods.mapper";
import type { MedioPagoAdminListRow } from "./payment-methods-admin.repository";
import type { MedioPagoRow } from "./payment-methods.repository";

export type AdminPaymentMethodListItem = PaymentMethodPublic & {
  clientId: number;
  clientName: string;
  clientEmail: string | null;
  verifierId: number | null;
};

export function mapAdminListRow(row: MedioPagoAdminListRow): AdminPaymentMethodListItem {
  const base = mapMedioPagoToPublic(row);
  return {
    ...base,
    clientId: row.cliente,
    clientName: row.client_name,
    clientEmail: row.client_email,
    verifierId: row.verificador,
  };
}

export type PaymentMethodVerifyResponse = {
  id: number;
  status: string;
  verifierId: number | null;
  verifiedAt: string | null;
};

export type PaymentMethodRejectResponse = {
  id: number;
  status: string;
  rejectionReason: string | null;
  verifierId: number | null;
};

function toIso(d: Date | null | undefined): string | null {
  if (!d) {
    return null;
  }
  return d instanceof Date ? d.toISOString() : new Date(d).toISOString();
}

export function mapVerifyResponse(row: MedioPagoRow): PaymentMethodVerifyResponse {
  return {
    id: row.identificador,
    status: row.estado,
    verifierId: row.verificador,
    verifiedAt: toIso(row.verificadoEn),
  };
}

export function mapRejectResponse(row: MedioPagoRow): PaymentMethodRejectResponse {
  return {
    id: row.identificador,
    status: row.estado,
    rejectionReason: row.motivoRechazo,
    verifierId: row.verificador,
  };
}
