import {
  categoryMeetsMinimum,
  parseCategoryRank,
} from "../../shared/domain/auction-categories";
import type { AuthUserContext } from "../../shared/types/auth";
import * as paymentMethodsRepository from "../payment-methods/payment-methods.repository";
import * as usersRepository from "../users/users.repository";
import { SUBASTA_ESTADO_ABIERTA, type SubastaRow } from "./subastas.repository";
import * as liveSessionStore from "./live-session.store";

export type AccessDenialCode =
  | "USER_NOT_ADMITTED"
  | "CATEGORY_NOT_ALLOWED"
  | "PAYMENT_METHOD_REQUIRED"
  | "PAYMENT_METHOD_NOT_VERIFIED"
  | "AUCTION_NOT_OPEN"
  | "AUTH_REQUIRED"
  | "CLIENT_NOT_FOUND"
  | "LIVE_SESSION_REQUIRED"
  | "LIVE_SESSION_OTHER_AUCTION";

export type AuctionAccessSnapshot = {
  canView: boolean;
  canAccess: boolean;
  canBid: boolean;
  cannotBidReason: AccessDenialCode | null;
  cannotAccessReason: AccessDenialCode | null;
  hasVerifiedPaymentMethod: boolean;
  liveSessionActive: boolean;
  liveSessionAuctionId: number | null;
};

function mapDbEstadoToApi(estado: string | null): "scheduled" | "live" | "closed" {
  const e = (estado ?? "").trim().toLowerCase();
  if (e === "carrada") {
    return "closed";
  }
  if (e === SUBASTA_ESTADO_ABIERTA) {
    return "live";
  }
  return "scheduled";
}

export function mapSubastaStatus(subasta: SubastaRow): "scheduled" | "live" | "closed" {
  return mapDbEstadoToApi(subasta.estado);
}

export function isAuctionOpen(subasta: SubastaRow): boolean {
  return mapSubastaStatus(subasta) === "live";
}

async function resolveClienteFromAuth(
  authUser: AuthUserContext | undefined
): Promise<{ clienteId: number; admitido: string; categoria: string | null } | null> {
  if (!authUser?.id || authUser.role === "empleado") {
    return null;
  }
  const personId = Number.parseInt(authUser.id, 10);
  if (!Number.isFinite(personId) || personId <= 0) {
    return null;
  }
  const cliente = await usersRepository.findClienteByPersonId(personId);
  if (!cliente) {
    return null;
  }
  return {
    clienteId: cliente.identificador,
    admitido: cliente.admitido,
    categoria: cliente.categoria,
  };
}

export async function hasVerifiedPaymentForCurrency(
  clienteId: number,
  auctionCurrency: string
): Promise<boolean> {
  const medios = await paymentMethodsRepository.listByCliente(clienteId);
  const currency = auctionCurrency.trim().toUpperCase();
  return medios.some(
    (m) => m.estado === "verificado" && m.moneda.trim().toUpperCase() === currency
  );
}

export async function evaluateAuctionAccess(params: {
  subasta: SubastaRow;
  authUser?: AuthUserContext;
  requireLiveSession?: boolean;
}): Promise<AuctionAccessSnapshot> {
  const { subasta, authUser, requireLiveSession = false } = params;
  const open = isAuctionOpen(subasta);
  const currency = subasta.moneda?.trim().toUpperCase() ?? "ARS";

  if (!authUser || authUser.tokenType !== "access") {
    return {
      canView: true,
      canAccess: false,
      canBid: false,
      cannotAccessReason: "AUTH_REQUIRED",
      cannotBidReason: "AUTH_REQUIRED",
      hasVerifiedPaymentMethod: false,
      liveSessionActive: false,
      liveSessionAuctionId: null,
    };
  }

  const cliente = await resolveClienteFromAuth(authUser);
  if (!cliente) {
    return {
      canView: true,
      canAccess: false,
      canBid: false,
      cannotAccessReason: "CLIENT_NOT_FOUND",
      cannotBidReason: "CLIENT_NOT_FOUND",
      hasVerifiedPaymentMethod: false,
      liveSessionActive: false,
      liveSessionAuctionId: null,
    };
  }

  const liveSessionAuctionId = liveSessionStore.getActiveAuctionId(cliente.clienteId);
  const liveSessionActive =
    liveSessionAuctionId !== null && liveSessionAuctionId === subasta.identificador;

  let cannotAccessReason: AccessDenialCode | null = null;
  let cannotBidReason: AccessDenialCode | null = null;

  if (cliente.admitido.trim().toLowerCase() !== "si") {
    cannotBidReason = "USER_NOT_ADMITTED";
  } else if (
    !subasta.categoria ||
    !parseCategoryRank(cliente.categoria) ||
    !parseCategoryRank(subasta.categoria) ||
    !categoryMeetsMinimum(cliente.categoria, subasta.categoria)
  ) {
    cannotBidReason = "CATEGORY_NOT_ALLOWED";
  }

  if (!open) {
    cannotBidReason = cannotBidReason ?? "AUCTION_NOT_OPEN";
  }

  const hasVerifiedPaymentMethod = await hasVerifiedPaymentForCurrency(
    cliente.clienteId,
    currency
  );
  if (!hasVerifiedPaymentMethod) {
    const medios = await paymentMethodsRepository.listByCliente(cliente.clienteId);
    if (medios.length === 0) {
      cannotBidReason = cannotBidReason ?? "PAYMENT_METHOD_REQUIRED";
    } else {
      cannotBidReason = cannotBidReason ?? "PAYMENT_METHOD_NOT_VERIFIED";
    }
  }

  if (requireLiveSession && open && !cannotBidReason) {
    if (liveSessionAuctionId === null) {
      cannotBidReason = "LIVE_SESSION_REQUIRED";
    } else if (liveSessionAuctionId !== subasta.identificador) {
      cannotBidReason = "LIVE_SESSION_OTHER_AUCTION";
    }
  }

  const canAccess = cannotAccessReason === null;
  const canBid = canAccess && open && hasVerifiedPaymentMethod && cannotBidReason === null;

  return {
    canView: true,
    canAccess,
    canBid,
    cannotAccessReason,
    cannotBidReason: canBid ? null : cannotBidReason,
    hasVerifiedPaymentMethod,
    liveSessionActive,
    liveSessionAuctionId,
  };
}
