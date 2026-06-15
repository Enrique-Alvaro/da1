import * as notificationsService from "./notifications.service";
import type { CreateNotificationInput } from "./notifications.types";
import * as notificationsRepository from "./notifications.repository";

function formatMoney(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString("es-AR", { minimumFractionDigits: 0 })}`;
}

export async function notifyOutbid(params: {
  outbidClienteId: number;
  auctionId: number;
  itemId: number;
  itemTitle: string;
  newAmount: number;
  currency: string;
  bidId: number;
}): Promise<void> {
  const input: CreateNotificationInput = {
    clienteId: params.outbidClienteId,
    type: "outbid",
    title: "Te han superado",
    message: `Otro usuario hizo una puja mayor en "${params.itemTitle}" (${formatMoney(params.newAmount, params.currency)}).`,
    auctionId: params.auctionId,
    itemId: params.itemId,
    idempotencyKey: `outbid:${params.itemId}:${params.outbidClienteId}:${params.bidId}`,
  };
  await notificationsService.createNotificationSafe(input);
}

export async function notifyAuctionWon(params: {
  winnerClienteId: number;
  auctionId: number;
  itemId: number;
  itemTitle: string;
  finalAmount: number;
  currency: string;
  commissionAmount: number;
  totalAmount: number;
  saleId: number;
}): Promise<void> {
  await notificationsService.createNotificationSafe({
    clienteId: params.winnerClienteId,
    type: "auction_won",
    title: "¡Felicitaciones! Ganaste la subasta",
    message: `Ganaste "${params.itemTitle}" con una oferta de ${formatMoney(params.finalAmount, params.currency)}. Comisión: ${formatMoney(params.commissionAmount, params.currency)}. Total: ${formatMoney(params.totalAmount, params.currency)}.`,
    auctionId: params.auctionId,
    itemId: params.itemId,
    saleId: params.saleId,
    idempotencyKey: `won:${params.saleId}:${params.winnerClienteId}`,
  });
}

export async function notifyAuctionLost(params: {
  clienteId: number;
  auctionId: number;
  itemId: number;
  itemTitle: string;
  winningAmount: number;
  currency: string;
  saleId: number;
}): Promise<void> {
  await notificationsService.createNotificationSafe({
    clienteId: params.clienteId,
    type: "auction_lost",
    title: "Artículo adjudicado",
    message: `"${params.itemTitle}" fue adjudicado. Oferta ganadora: ${formatMoney(params.winningAmount, params.currency)}.`,
    auctionId: params.auctionId,
    itemId: params.itemId,
    saleId: params.saleId,
    idempotencyKey: `lost:${params.saleId}:${params.clienteId}`,
  });
}

export async function notifyCompanyPurchase(params: {
  auctionId: number;
  itemId: number;
  itemTitle: string;
  basePrice: number;
  currency: string;
  saleId: number;
  bidderClienteIds: number[];
}): Promise<void> {
  for (const clienteId of params.bidderClienteIds) {
    await notificationsService.createNotificationSafe({
      clienteId,
      type: "item_finalized",
      title: "Artículo finalizado sin pujas",
      message: `"${params.itemTitle}" finalizó sin pujas. La empresa adquirió el artículo por ${formatMoney(params.basePrice, params.currency)}.`,
      auctionId: params.auctionId,
      itemId: params.itemId,
      saleId: params.saleId,
      idempotencyKey: `company:${params.saleId}:${clienteId}`,
    });
  }
}

export async function notifyPaymentMethodVerified(params: {
  clienteId: number;
  paymentMethodId: number;
  entity: string | null;
  lastDigits: string | null;
}): Promise<void> {
  const detail = params.lastDigits
    ? `${params.entity ?? "Medio de pago"} •••• ${params.lastDigits}`
    : params.entity ?? "Medio de pago";
  await notificationsService.createNotificationSafe({
    clienteId: params.clienteId,
    type: "payment_method_verified",
    title: "Medio de pago verificado",
    message: `Tu ${detail} fue verificado. Ya podés participar en subastas.`,
    paymentMethodId: params.paymentMethodId,
    idempotencyKey: `pm-verified:${params.paymentMethodId}`,
  });
}

export async function notifyPaymentMethodRejected(params: {
  clienteId: number;
  paymentMethodId: number;
  reason: string;
}): Promise<void> {
  await notificationsService.createNotificationSafe({
    clienteId: params.clienteId,
    type: "payment_method_rejected",
    title: "Medio de pago rechazado",
    message: params.reason.trim() || "Tu medio de pago fue rechazado. Revisá los datos o registrá otro.",
    paymentMethodId: params.paymentMethodId,
    idempotencyKey: `pm-rejected:${params.paymentMethodId}:${Date.now()}`,
  });
}

export async function notifyClientAdmitted(params: { clienteId: number }): Promise<void> {
  await notificationsService.createNotificationSafe({
    clienteId: params.clienteId,
    type: "client_admitted",
    title: "Cuenta admitida",
    message: "Tu cuenta fue aprobada. Ya podés participar en subastas.",
    idempotencyKey: `admitted:${params.clienteId}`,
  });
}

export async function notifyLeadingBid(params: {
  clienteId: number;
  auctionId: number;
  itemId: number;
  itemTitle: string;
  amount: number;
  currency: string;
  bidId: number;
}): Promise<void> {
  await notificationsService.createNotificationSafe({
    clienteId: params.clienteId,
    type: "leading_bid",
    title: "Eres el mejor postor actualmente",
    message: `Tu puja de ${formatMoney(params.amount, params.currency)} está ganando en "${params.itemTitle}".`,
    auctionId: params.auctionId,
    itemId: params.itemId,
    idempotencyKey: `leading:${params.itemId}:${params.clienteId}:${params.bidId}`,
  });
}

export async function emitItemCloseNotifications(params: {
  auctionId: number;
  itemId: number;
  itemTitle: string;
  currency: string;
  basePrice: number;
  saleId: number;
  resultType: "BIDDER_WON" | "COMPANY_PURCHASED";
  winnerClienteId: number | null;
  finalAmount: number;
  commissionAmount: number;
  totalAmount: number;
}): Promise<void> {
  try {
    const bidderIds = await notificationsRepository.listDistinctBiddersForItem(params.itemId);
    const title = params.itemTitle.trim() || `Artículo #${params.itemId}`;

    if (params.resultType === "BIDDER_WON" && params.winnerClienteId != null) {
      await notifyAuctionWon({
        winnerClienteId: params.winnerClienteId,
        auctionId: params.auctionId,
        itemId: params.itemId,
        itemTitle: title,
        finalAmount: params.finalAmount,
        currency: params.currency,
        commissionAmount: params.commissionAmount,
        totalAmount: params.totalAmount,
        saleId: params.saleId,
      });
      for (const clienteId of bidderIds) {
        if (clienteId === params.winnerClienteId) continue;
        await notifyAuctionLost({
          clienteId,
          auctionId: params.auctionId,
          itemId: params.itemId,
          itemTitle: title,
          winningAmount: params.finalAmount,
          currency: params.currency,
          saleId: params.saleId,
        });
      }
      return;
    }

    await notifyCompanyPurchase({
      auctionId: params.auctionId,
      itemId: params.itemId,
      itemTitle: title,
      basePrice: params.basePrice,
      currency: params.currency,
      saleId: params.saleId,
      bidderClienteIds: bidderIds,
    });
  } catch {
    /* notification side-effects must not break item close */
  }
}
