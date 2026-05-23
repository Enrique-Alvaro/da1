import type { RequestHandler } from "express";

/** Mapea el parámetro de ruta `auctionId` a `id` para handlers compartidos de subastas. */
export const normalizeAuctionIdParam: RequestHandler = (req, _res, next) => {
  const auctionId = req.params.auctionId;
  if (auctionId !== undefined && req.params.id === undefined) {
    req.params.id = auctionId;
  }
  next();
};
