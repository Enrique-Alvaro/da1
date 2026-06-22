import type { CatalogItemRow } from "./subastas-items.repository";

/**
 * Ítem actual determinista (`NO_CURRENT_ITEM_FIELD`):
 * primer ítem del catálogo con subastado = 'no' y sin registroDeSubasta, por identificador ASC.
 */
export function pickCurrentItemId(
  items: CatalogItemRow[],
  auctionStatus: "scheduled" | "live" | "closed"
): number | null {
  if (auctionStatus !== "live") {
    return null;
  }
  const candidate = items
    .filter((it) => {
      const sub = (it.subastado ?? "no").trim().toLowerCase();
      return sub !== "si" && it.isSoldInRegistro === 0;
    })
    .sort((a, b) => a.identificador - b.identificador)[0];
  return candidate?.identificador ?? null;
}

/** True when the catalog has at least one item and every item is sold or in registroDeSubasta. */
export function areAllCatalogItemsSold(items: CatalogItemRow[]): boolean {
  if (items.length === 0) {
    return false;
  }
  return items.every((it) => {
    const sub = (it.subastado ?? "no").trim().toLowerCase();
    return sub === "si" || it.isSoldInRegistro > 0;
  });
}
