import type { RequestHandler } from "express";
import { ValidationError } from "../../shared/errors/httpErrors";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { formatZodError, subastasIdParamSchema } from "./subastas.schema";
import * as subastasRepository from "./subastas.repository";

export const listSubastas: RequestHandler = asyncHandler(async (_req, res) => {
  const rows = await subastasRepository.listSubastas();
  res.status(200).json({ items: rows });
});

export const getSubasta: RequestHandler = asyncHandler(async (req, res) => {
  const parsed = subastasIdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    throw new ValidationError(formatZodError(parsed.error));
  }
  const row = await subastasRepository.requireSubastaById(parsed.data.id);
  res.status(200).json(row);
});
