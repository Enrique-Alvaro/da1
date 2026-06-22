import type { RequestHandler } from "express";
import { ValidationError } from "../../shared/errors/httpErrors";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import {
  adminProductIdParamSchema,
  formatZodError,
  updateDepositoBodySchema,
  updateSeguroBodySchema,
} from "./admin-productos.schema";
import * as adminProductosService from "./admin-productos.service";

export const patchProductDeposito: RequestHandler = asyncHandler(async (req, res) => {
  const parsedParams = adminProductIdParamSchema.safeParse(req.params);
  if (!parsedParams.success) {
    throw new ValidationError(formatZodError(parsedParams.error));
  }
  const parsedBody = updateDepositoBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    throw new ValidationError(formatZodError(parsedBody.error));
  }
  const result = await adminProductosService.updateProductDeposito(
    parsedParams.data.id,
    parsedBody.data
  );
  res.status(200).json(result);
});

export const patchProductSeguro: RequestHandler = asyncHandler(async (req, res) => {
  const parsedParams = adminProductIdParamSchema.safeParse(req.params);
  if (!parsedParams.success) {
    throw new ValidationError(formatZodError(parsedParams.error));
  }
  const parsedBody = updateSeguroBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    throw new ValidationError(formatZodError(parsedBody.error));
  }
  const result = await adminProductosService.updateProductSeguro(
    parsedParams.data.id,
    parsedBody.data
  );
  res.status(200).json(result);
});
