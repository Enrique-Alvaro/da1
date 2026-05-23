import type { RequestHandler } from "express";
import { BadRequestError, UnauthorizedError, ValidationError } from "../../shared/errors/httpErrors";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import {
  closeItemBodySchema,
  formatZodError,
  subastaItemParamsSchema,
} from "./subastas-closing.schema";
import * as closingService from "./subastas-closing.service";

export const closeAuctionItem: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.authUser) {
    throw new UnauthorizedError("No autorizado.");
  }
  closingService.assertEmployeeCanClose(req.authUser);

  const params = subastaItemParamsSchema.safeParse(req.params);
  if (!params.success) {
    throw new ValidationError(formatZodError(params.error));
  }

  const bodyParsed = closeItemBodySchema.safeParse(req.body ?? {});
  if (!bodyParsed.success) {
    throw new BadRequestError(formatZodError(bodyParsed.error));
  }

  const result = await closingService.closeAuctionItem(
    params.data.id,
    params.data.itemId,
    bodyParsed.data
  );
  res.status(200).json(result);
});

export const getAuctionItemResult: RequestHandler = asyncHandler(async (req, res) => {
  const params = subastaItemParamsSchema.safeParse(req.params);
  if (!params.success) {
    throw new ValidationError(formatZodError(params.error));
  }
  const result = await closingService.getItemFinalizationResult(
    params.data.id,
    params.data.itemId,
    req.authUser
  );
  res.status(200).json(result);
});
