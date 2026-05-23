import { getCompanyClientId } from "../../config/env";
import type { AuthUserContext } from "../../shared/types/auth";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../../shared/errors/httpErrors";
import { assertPaymentMethodForBid } from "../pujos/pujos-payment-validation";
import * as paymentMethodsRepository from "../payment-methods/payment-methods.repository";
import * as usersRepository from "../users/users.repository";
import type { CloseItemBody } from "./subastas-closing.schema";
import * as closingRepository from "./subastas-closing.repository";
import type { FinalizationResponse } from "./subastas-closing.types";
import { requireSubastaById } from "./subastas.repository";

const SHIPPING_AMOUNT = 0;
const MIN_REGISTRO_COMISION = 0.02;

function buildFinalizationResponse(params: {
  auctionId: number;
  itemId: number;
  productId: number;
  resultType: FinalizationResponse["resultType"];
  winnerUserId: number | null;
  winnerDisplayName: string | null;
  finalAmount: number;
  currency: string;
  basePrice: number;
  commissionAmount: number;
  paymentMethodId: number | null;
  registroId: number | null;
  title?: string | null;
  isCurrentUserWinner?: boolean;
  limitations?: string[];
}): FinalizationResponse {
  const totalAmount = params.finalAmount + params.commissionAmount + SHIPPING_AMOUNT;
  const sold = params.resultType !== "NOT_FINALIZED";
  return {
    auctionId: params.auctionId,
    itemId: params.itemId,
    productId: params.productId,
    status: sold ? "sold" : "not_finalized",
    resultType: params.resultType,
    winnerUserId: params.winnerUserId,
    winnerDisplayName: params.winnerDisplayName,
    finalAmount: params.finalAmount,
    currency: params.currency,
    basePrice: params.basePrice,
    commissionAmount: params.commissionAmount,
    shippingAmount: SHIPPING_AMOUNT,
    totalAmount,
    paymentMethodId: params.paymentMethodId,
    registroId: params.registroId,
    finalizedAt: sold ? new Date().toISOString() : null,
    title: params.title ?? null,
    isCurrentUserWinner: params.isCurrentUserWinner,
    limitations: params.limitations,
  };
}

function registroToResponse(
  registro: closingRepository.RegistroDeSubastaRow,
  ctx: closingRepository.ItemCloseContextRow,
  paymentMethodId: number | null,
  authUser?: AuthUserContext
): FinalizationResponse {
  const companyClientId = getCompanyClientId();
  const isCompany =
    companyClientId !== null && registro.cliente === companyClientId;
  const resultType: FinalizationResponse["resultType"] = isCompany
    ? "COMPANY_PURCHASED"
    : "BIDDER_WON";

  let isCurrentUserWinner: boolean | undefined;
  if (authUser && authUser.role !== "empleado") {
    const pid = Number.parseInt(authUser.id, 10);
    isCurrentUserWinner = Number.isFinite(pid) && pid === registro.cliente;
  }

  return buildFinalizationResponse({
    auctionId: registro.subasta,
    itemId: ctx.itemId,
    productId: registro.producto,
    resultType,
    winnerUserId: isCompany ? null : registro.cliente,
    winnerDisplayName: isCompany ? "Empresa" : `Cliente ${registro.cliente}`,
    finalAmount: Number(registro.importe),
    currency: (ctx.moneda ?? "ARS").trim().toUpperCase(),
    basePrice: Number(ctx.precioBase),
    commissionAmount: Number(registro.comision),
    paymentMethodId,
    registroId: registro.identificador,
    title: ctx.descripcionCatalogo,
    isCurrentUserWinner,
    limitations: [
      "NO_PERSISTED_FINALIZATION_TIMESTAMP",
      "NO_SHIPPING_SCHEMA_SUPPORT",
      "NO_PAYMENT_METHOD_ON_BID",
    ],
  });
}

export async function closeAuctionItem(
  auctionId: number,
  itemId: number,
  body: CloseItemBody
): Promise<FinalizationResponse> {
  await requireSubastaById(auctionId);

  const ctx = await closingRepository.findItemCloseContext(auctionId, itemId);
  if (!ctx) {
    throw new NotFoundError("Ítem no encontrado en esta subasta.", "ITEM_NOT_FOUND");
  }

  const existing = await closingRepository.findRegistroByProductoAndSubasta(
    ctx.productoId,
    auctionId
  );
  if (existing) {
    return registroToResponse(existing, ctx, body.paymentMethodId ?? null);
  }

  if ((ctx.subastado ?? "no").trim().toLowerCase() === "si") {
    throw new ConflictError("El ítem ya fue finalizado.", "ITEM_ALREADY_FINALIZED");
  }

  const currency = (ctx.moneda ?? "ARS").trim().toUpperCase();
  const basePrice = Number(ctx.precioBase);
  const catalogCommission = Number(ctx.comision);
  const winningBid = await closingRepository.findWinningBidForClose(itemId);

  const limitations: string[] = [
    "NO_SHIPPING_SCHEMA_SUPPORT",
    "NO_COMMISSION_PERCENTAGE_SCHEMA",
  ];

  if (winningBid) {
    if (body.paymentMethodId !== undefined) {
      const medio = await paymentMethodsRepository.findByIdAndCliente(
        body.paymentMethodId,
        winningBid.clienteId
      );
      assertPaymentMethodForBid(medio, currency, winningBid.importe);
    } else {
      limitations.push("NO_PAYMENT_METHOD_ON_BID");
    }

    const registro = await closingRepository.persistItemClose({
      auctionId,
      itemId,
      productoId: ctx.productoId,
      duenioId: ctx.duenioId,
      clienteId: winningBid.clienteId,
      finalAmount: Number(winningBid.importe),
      commissionAmount: catalogCommission,
      winningPujoId: winningBid.pujoId,
    });

    return buildFinalizationResponse({
      auctionId,
      itemId,
      productId: ctx.productoId,
      resultType: "BIDDER_WON",
      winnerUserId: winningBid.clienteId,
      winnerDisplayName:
        winningBid.personaNombre?.trim() || `Postor ${winningBid.numeroPostor}`,
      finalAmount: Number(registro.importe),
      currency,
      basePrice,
      commissionAmount: Number(registro.comision),
      paymentMethodId: body.paymentMethodId ?? null,
      registroId: registro.identificador,
      title: ctx.descripcionCatalogo,
      limitations,
    });
  }

  limitations.push("PARTIAL_COMPANY_PURCHASE_SUPPORT");
  const companyClientId = getCompanyClientId();

  if (companyClientId === null) {
    await closingRepository.markItemSoldOnly(itemId);
    return buildFinalizationResponse({
      auctionId,
      itemId,
      productId: ctx.productoId,
      resultType: "COMPANY_PURCHASED",
      winnerUserId: null,
      winnerDisplayName: "Empresa",
      finalAmount: basePrice,
      currency,
      basePrice,
      commissionAmount: 0,
      paymentMethodId: null,
      registroId: null,
      title: ctx.descripcionCatalogo,
      limitations: [...limitations, "NO_PERSISTED_COMPANY_REGISTRO"],
    });
  }

  const registro = await closingRepository.persistItemClose({
    auctionId,
    itemId,
    productoId: ctx.productoId,
    duenioId: ctx.duenioId,
    clienteId: companyClientId,
    finalAmount: basePrice,
    commissionAmount: MIN_REGISTRO_COMISION,
    winningPujoId: null,
  });

  return buildFinalizationResponse({
    auctionId,
    itemId,
    productId: ctx.productoId,
    resultType: "COMPANY_PURCHASED",
    winnerUserId: companyClientId,
    winnerDisplayName: "Empresa",
    finalAmount: Number(registro.importe),
    currency,
    basePrice,
    commissionAmount: Number(registro.comision),
    paymentMethodId: null,
    registroId: registro.identificador,
    title: ctx.descripcionCatalogo,
    limitations,
  });
}

export async function getItemFinalizationResult(
  auctionId: number,
  itemId: number,
  authUser?: AuthUserContext
): Promise<FinalizationResponse> {
  await requireSubastaById(auctionId);
  const ctx = await closingRepository.findItemCloseContext(auctionId, itemId);
  if (!ctx) {
    throw new NotFoundError("Ítem no encontrado en esta subasta.", "ITEM_NOT_FOUND");
  }

  const registro = await closingRepository.findRegistroByProductoAndSubasta(
    ctx.productoId,
    auctionId
  );

  if (!registro) {
    return buildFinalizationResponse({
      auctionId,
      itemId,
      productId: ctx.productoId,
      resultType: "NOT_FINALIZED",
      winnerUserId: null,
      winnerDisplayName: null,
      finalAmount: 0,
      currency: (ctx.moneda ?? "ARS").trim().toUpperCase(),
      basePrice: Number(ctx.precioBase),
      commissionAmount: 0,
      paymentMethodId: null,
      registroId: null,
      title: ctx.descripcionCatalogo,
      limitations: (ctx.subastado ?? "").toLowerCase() === "si"
        ? ["NO_PERSISTED_FINALIZATION_STATUS"]
        : undefined,
    });
  }

  const response = registroToResponse(registro, ctx, null, authUser);
  if (response.resultType === "BIDDER_WON") {
    const profile = await usersRepository.findProfileByPersonId(registro.cliente);
    if (profile?.full_name) {
      response.winnerDisplayName = profile.full_name;
    }
  }
  return response;
}

export function assertEmployeeCanClose(authUser: AuthUserContext): void {
  if (authUser.role !== "empleado") {
    throw new ForbiddenError(
      "Solo un empleado puede finalizar ítems de subasta.",
      "NO_PERMISSION_TO_CLOSE_AUCTION"
    );
  }
}
