import type { RequestHandler } from "express";
import { ValidationError } from "../../shared/errors/httpErrors";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import {
  formatZodError,
  paisesCreateBodySchema,
  paisesIdParamSchema,
  paisesUpdateBodySchema,
} from "./paises.schema";
import * as paisesRepository from "./paises.repository";

export const listPaises: RequestHandler = asyncHandler(async (_req, res) => {
  const rows = await paisesRepository.listPaises();
  res.status(200).json({ items: rows });
});

export const getPais: RequestHandler = asyncHandler(async (req, res) => {
  const parsed = paisesIdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    throw new ValidationError(formatZodError(parsed.error));
  }
  const row = await paisesRepository.requirePaisByNumero(parsed.data.id);
  res.status(200).json(row);
});

export const createPais: RequestHandler = asyncHandler(async (req, res) => {
  const parsed = paisesCreateBodySchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError(formatZodError(parsed.error));
  }
  const row = await paisesRepository.insertPais(parsed.data);
  res.status(201).json(row);
});

export const updatePais: RequestHandler = asyncHandler(async (req, res) => {
  const parsedParams = paisesIdParamSchema.safeParse(req.params);
  if (!parsedParams.success) {
    throw new ValidationError(formatZodError(parsedParams.error));
  }
  const parsedBody = paisesUpdateBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    throw new ValidationError(formatZodError(parsedBody.error));
  }
  const row = await paisesRepository.updatePais(parsedParams.data.id, parsedBody.data);
  res.status(200).json(row);
});

export const removePais: RequestHandler = asyncHandler(async (req, res) => {
  const parsed = paisesIdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    throw new ValidationError(formatZodError(parsed.error));
  }
  await paisesRepository.deletePais(parsed.data.id);
  res.status(204).send();
});
