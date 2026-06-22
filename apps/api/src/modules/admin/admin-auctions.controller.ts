import type { Request, Response } from "express";
import { BadRequestError } from "../../shared/errors/httpErrors";
import {
  auctionIdParamSchema,
  createAuctionBodySchema,
  formatZodError,
  updateAuctionBodySchema,
} from "./admin-auctions.schema";
import { createAdminAuction, updateAdminAuction } from "./admin-auctions.service";

export async function createAuction(req: Request, res: Response): Promise<void> {
  const parsed = createAuctionBodySchema.safeParse(req.body);
  if (!parsed.success) {
    throw new BadRequestError(formatZodError(parsed.error));
  }
  const result = await createAdminAuction(parsed.data);
  res.status(201).json(result);
}

export async function patchAuction(req: Request, res: Response): Promise<void> {
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
}
