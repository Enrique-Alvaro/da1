import { categoryMeetsMinimum } from "../../shared/domain/auction-categories";
import { UnauthorizedError } from "../../shared/errors/httpErrors";
import type { AuthUserContext } from "../../shared/types/auth";
import * as paymentMethodsRepository from "../payment-methods/payment-methods.repository";
import { requireSubastaById } from "../subastas/subastas.repository";
import * as usersRepository from "./users.repository";
import type { UserCategory } from "./user.mapper";

export type CannotBidReasonCode =
  | "USER_NOT_ADMITTED"
  | "PAYMENT_METHOD_REQUIRED"
  | "PAYMENT_METHOD_NOT_VERIFIED"
  | "CATEGORY_NOT_ALLOWED"
  | "NONE";

export type MyOperationalStatus = {
  clienteId: number;
  admitido: "si" | "no";
  categoria: UserCategory;
  hasVerifiedPaymentMethod: boolean;
  canBid: boolean;
  cannotBidReason: Exclude<CannotBidReasonCode, "NONE"> | null;
  auctionId: number | null;
};

function parsePersonId(authUser: AuthUserContext): number {
  const n = Number.parseInt(authUser.id, 10);
  if (!Number.isSafeInteger(n) || n <= 0) {
    throw new UnauthorizedError("No autorizado.", "UNAUTHENTICATED");
  }
  return n;
}

export async function getMyOperationalStatus(
  authUser: AuthUserContext,
  auctionId?: number
): Promise<MyOperationalStatus> {
  if (authUser.role === "empleado") {
    throw new UnauthorizedError("No autorizado.", "UNAUTHENTICATED");
  }

  const personId = parsePersonId(authUser);
  const cliente = await usersRepository.findClienteByPersonId(personId);
  if (!cliente) {
    throw new UnauthorizedError("No autorizado.", "UNAUTHENTICATED");
  }

  const admitido = cliente.admitido.trim().toLowerCase() === "si" ? "si" : "no";
  const categoria = cliente.categoria.trim().toLowerCase() as UserCategory;

  const medios = await paymentMethodsRepository.listByCliente(cliente.identificador);
  const hasVerifiedPaymentMethod = medios.some((m) => m.estado === "verificado");

  let cannotBidReason: CannotBidReasonCode | null = null;

  if (admitido !== "si") {
    cannotBidReason = "USER_NOT_ADMITTED";
  } else if (medios.length === 0) {
    cannotBidReason = "PAYMENT_METHOD_REQUIRED";
  } else if (!hasVerifiedPaymentMethod) {
    cannotBidReason = "PAYMENT_METHOD_NOT_VERIFIED";
  } else if (auctionId !== undefined) {
    const subasta = await requireSubastaById(auctionId);
    if (!categoryMeetsMinimum(categoria, subasta.categoria ?? "")) {
      cannotBidReason = "CATEGORY_NOT_ALLOWED";
    }
  }

  const canBid = cannotBidReason === null;

  return {
    clienteId: cliente.identificador,
    admitido,
    categoria,
    hasVerifiedPaymentMethod,
    canBid,
    cannotBidReason: canBid ? null : cannotBidReason,
    auctionId: auctionId ?? null,
  };
}
