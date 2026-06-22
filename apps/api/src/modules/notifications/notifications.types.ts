export const NOTIFICATION_TYPES = [
  "auction_won",
  "auction_lost",
  "outbid",
  "leading_bid",
  "item_finalized",
  "auction_started",
  "auction_ended",
  "payment_method_verified",
  "payment_method_rejected",
  "client_admitted",
  "submission_pending",
  "submission_accepted",
  "submission_rejected",
  "submission_custody_updated",
  "payment_pending",
  "payment_confirmed",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type NotificationRow = {
  identificador: number;
  cliente: number;
  tipo: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  auctionId: number | null;
  itemId: number | null;
  saleId: number | null;
  paymentMethodId: number | null;
  submissionId: number | null;
  idempotencyKey: string | null;
  creadoEn: Date;
};

export type CreateNotificationInput = {
  clienteId: number;
  type: NotificationType | string;
  title: string;
  message: string;
  auctionId?: number | null;
  itemId?: number | null;
  saleId?: number | null;
  paymentMethodId?: number | null;
  submissionId?: number | null;
  idempotencyKey?: string | null;
};

export type NotificationPublic = {
  id: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  auctionId: number | null;
  itemId: number | null;
  saleId: number | null;
  paymentMethodId: number | null;
  submissionId: number | null;
  createdAt: string;
};

export type NotificationListResponse = {
  items: NotificationPublic[];
  unreadCount: number;
  total: number;
  limit: number;
  offset: number;
};
