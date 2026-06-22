import type { RequestHandler } from "express";
import { BadRequestError } from "../../shared/errors/httpErrors";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import {
  auctionIdParamSchema,
  createAuctionBodySchema,
  formatZodError,
  patchAuctionEstadoBodySchema,
  updateAuctionBodySchema,
} from "./admin-auctions.schema";
import { createAdminAuction, updateAdminAuction, updateAdminAuctionEstado } from "./admin-auctions.service";

export const createAuction: RequestHandler = asyncHandler(async (req, res) => {
  const parsed = createAuctionBodySchema.safeParse(req.body);
  if (!parsed.success) {
    throw new BadRequestError(formatZodError(parsed.error));
  }
  const result = await createAdminAuction(parsed.data);
  res.status(201).json(result);
});

export const patchAuction: RequestHandler = asyncHandler(async (req, res) => {
  const params = auctionIdParamSchema.safeParse(req.params);
  if (!params.success) {
    throw new BadRequestError(formatZodError(params.error));
  }
  const parsed = updateAuctionBodySchema.safeParse(req.body);
  if (!parsed.success) {
    throw new BadRequestError(formatZodError(parsed.error));
  }
  const result = await updateAdminAuction(params.data.id, parsed.data);
  res.status(200).json(result);
});

export const patchAuctionEstado: RequestHandler = asyncHandler(async (req, res) => {
  const params = auctionIdParamSchema.safeParse(req.params);
  if (!params.success) {
    throw new BadRequestError(formatZodError(params.error));
  }
  const parsed = patchAuctionEstadoBodySchema.safeParse(req.body);
  if (!parsed.success) {
    throw new BadRequestError(formatZodError(parsed.error));
  }
  const result = await updateAdminAuctionEstado(params.data.id, parsed.data.estado);
  res.status(200).json(result);
});
