/** Orden de categorías del esquema académico (menor = acceso más básico). */
const CATEGORY_RANK: Record<string, number> = {
  comun: 1,
  especial: 2,
  plata: 3,
  oro: 4,
  platino: 5,
};

const PREMIUM_AUCTION_CATEGORIES = new Set(["oro", "platino"]);

export function parseCategoryRank(value: string | null | undefined): number | null {
  if (value == null) {
    return null;
  }
  const key = value.trim().toLowerCase();
  return CATEGORY_RANK[key] ?? null;
}

/** El cliente puede participar si su categoría es >= la de la subasta. */
export function categoryMeetsMinimum(
  clientCategory: string,
  auctionCategory: string
): boolean {
  const clientRank = parseCategoryRank(clientCategory);
  const auctionRank = parseCategoryRank(auctionCategory);
  if (clientRank === null || auctionRank === null) {
    return false;
  }
  return clientRank >= auctionRank;
}

export function isPremiumAuctionCategory(auctionCategory: string): boolean {
  return PREMIUM_AUCTION_CATEGORIES.has(auctionCategory.trim().toLowerCase());
}
