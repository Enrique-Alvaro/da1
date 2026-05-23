import type { RequestHandler } from "express";

/** Maps `auctionId` route param to `id` for shared subastas handlers. */
export const normalizeAuctionIdParam: RequestHandler = (req, _res, next) => {
  const auctionId = req.params.auctionId;
  if (auctionId !== undefined && req.params.id === undefined) {
    req.params.id = auctionId;
  }
  next();
};
