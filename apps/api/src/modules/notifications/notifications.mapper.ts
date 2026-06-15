import type { NotificationPublic, NotificationRow } from "./notifications.types";

export function mapNotificationRow(row: NotificationRow): NotificationPublic {
  return {
    id: row.identificador,
    type: row.tipo,
    title: row.titulo,
    message: row.mensaje,
    read: row.leida,
    auctionId: row.auctionId,
    itemId: row.itemId,
    saleId: row.saleId,
    paymentMethodId: row.paymentMethodId,
    submissionId: row.submissionId,
    createdAt: row.creadoEn.toISOString(),
  };
}
