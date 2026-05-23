import type { AuthUserContext } from "../../shared/types/auth";
import { ForbiddenError, UnauthorizedError } from "../../shared/errors/httpErrors";
import * as usersRepository from "./users.repository";
import * as purchasesRepository from "./users-purchases.repository";

const SHIPPING_AMOUNT = 0;

export async function listMyPurchases(authUser: AuthUserContext) {
  if (authUser.role === "empleado") {
    throw new ForbiddenError("Esta acción no está disponible para empleados.");
  }
  const personId = Number.parseInt(authUser.id, 10);
  if (!Number.isFinite(personId) || personId <= 0) {
    throw new UnauthorizedError("No autorizado.");
  }
  const cliente = await usersRepository.findClienteByPersonId(personId);
  if (!cliente) {
    return { items: [], limitations: ["NO_PURCHASE_STATUS_SUPPORT"] };
  }

  const rows = await purchasesRepository.listPurchasesByCliente(cliente.identificador);
  return {
    items: rows.map((r) => {
      const commission = Number(r.commissionAmount);
      const finalAmount = Number(r.finalAmount);
      return {
        registroId: r.registroId,
        auctionId: r.auctionId,
        itemId: r.itemId,
        productId: r.productoId,
        title: r.title,
        productTitle: r.title,
        finalAmount,
        commissionAmount: commission,
        shippingAmount: SHIPPING_AMOUNT,
        totalAmount: finalAmount + commission + SHIPPING_AMOUNT,
        currency: r.currency ?? "ARS",
        finalizedAt: null,
        status: "unknown" as const,
        paymentMethodSummary: null,
      };
    }),
    limitations: [
      "NO_PURCHASE_STATUS_SUPPORT",
      "NO_SHIPPING_SCHEMA_SUPPORT",
      "NO_PERSISTED_FINALIZATION_TIMESTAMP",
      "NO_PAYMENT_METHOD_ON_BID",
    ],
  };
}
