import { isPremiumAuctionCategory } from "../../shared/domain/auction-categories";

export type BidLimits = {
  currentBest: number;
  minNextBid: number;
  maxNextBid: number | null;
  percentLimitsApply: boolean;
};

export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function computeBidLimits(
  currentBest: number,
  basePrice: number,
  auctionCategory: string
): BidLimits {
  const best = roundMoney(currentBest);
  const base = roundMoney(basePrice);
  const premium = isPremiumAuctionCategory(auctionCategory);
  if (premium) {
    return {
      currentBest: best,
      minNextBid: roundMoney(best + 0.01),
      maxNextBid: null,
      percentLimitsApply: false,
    };
  }
  return {
    currentBest: best,
    minNextBid: roundMoney(best + base * 0.01),
    maxNextBid: roundMoney(best + base * 0.2),
    percentLimitsApply: true,
  };
}
