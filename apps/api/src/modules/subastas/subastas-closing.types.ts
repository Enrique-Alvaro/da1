export type FinalizationResultType = "BIDDER_WON" | "COMPANY_PURCHASED" | "NOT_FINALIZED";

export type FinalizationResponse = {
  auctionId: number;
  itemId: number;
  productId: number;
  status: "sold" | "pending" | "not_finalized";
  resultType: FinalizationResultType;
  winnerUserId: number | null;
  winnerDisplayName: string | null;
  finalAmount: number;
  currency: string;
  basePrice: number;
  commissionAmount: number;
  shippingAmount: number;
  totalAmount: number;
  paymentMethodId: number | null;
  registroId: number | null;
  finalizedAt: string | null;
  isCurrentUserWinner?: boolean;
  title?: string | null;
  limitations?: string[];
};
