import type { RequestHandler } from "express";
import { ValidationError } from "../../shared/errors/httpErrors";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { formatZodError, itemIdParamSchema } from "./items.schema";
import * as subastasService from "../subastas/subastas.service";

export const getItem: RequestHandler = asyncHandler(async (req, res) => {
  const parsed = itemIdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    throw new ValidationError(formatZodError(parsed.error));
  }
  const result = await subastasService.getCatalogItemDetail(parsed.data.id, req.authUser);
  res.status(200).json(result);
});
