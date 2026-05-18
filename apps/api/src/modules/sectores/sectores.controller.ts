import type { RequestHandler } from "express";
import { ValidationError } from "../../shared/errors/httpErrors";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import {
  formatZodError,
  sectoresCreateBodySchema,
  sectoresIdParamSchema,
  sectoresUpdateBodySchema,
} from "./sectores.schema";
import * as sectoresRepository from "./sectores.repository";

export const listSectores: RequestHandler = asyncHandler(async (_req, res) => {
  const rows = await sectoresRepository.listSectores();
  res.status(200).json({ items: rows });
});

export const getSector: RequestHandler = asyncHandler(async (req, res) => {
  const parsed = sectoresIdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    throw new ValidationError(formatZodError(parsed.error));
  }
  const row = await sectoresRepository.requireSectorById(parsed.data.id);
  res.status(200).json(row);
});

export const createSector: RequestHandler = asyncHandler(async (req, res) => {
  const parsed = sectoresCreateBodySchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError(formatZodError(parsed.error));
  }
  const row = await sectoresRepository.insertSector(parsed.data);
  res.status(201).json(row);
});

export const updateSector: RequestHandler = asyncHandler(async (req, res) => {
  const parsedParams = sectoresIdParamSchema.safeParse(req.params);
  if (!parsedParams.success) {
    throw new ValidationError(formatZodError(parsedParams.error));
  }
  const parsedBody = sectoresUpdateBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    throw new ValidationError(formatZodError(parsedBody.error));
  }
  const row = await sectoresRepository.updateSector(parsedParams.data.id, parsedBody.data);
  res.status(200).json(row);
});

export const removeSector: RequestHandler = asyncHandler(async (req, res) => {
  const parsed = sectoresIdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    throw new ValidationError(formatZodError(parsed.error));
  }
  await sectoresRepository.deleteSector(parsed.data.id);
  res.status(204).send();
});
