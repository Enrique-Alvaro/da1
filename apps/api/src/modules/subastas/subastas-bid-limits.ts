import { isPremiumAuctionCategory } from "../../shared/domain/auction-categories";

export type BidLimits = {
  currentBest: number;
  minNextBid: number;
  maxNextBid: number | null;
  percentLimitsApply: boolean;
};

export function computeBidLimits(
  currentBest: number,
  basePrice: number,
  auctionCategory: string
): BidLimits {
  const premium = isPremiumAuctionCategory(auctionCategory);
  if (premium) {
    return {
      currentBest,
      minNextBid: currentBest + 0.01,
      maxNextBid: null,
      percentLimitsApply: false,
    };
  }
  return {
    currentBest,
    minNextBid: currentBest + basePrice * 0.01,
    maxNextBid: currentBest + basePrice * 0.2,
    percentLimitsApply: true,
  };
}
