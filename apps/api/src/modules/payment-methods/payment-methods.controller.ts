import type { RequestHandler } from "express";
import { UnauthorizedError, ValidationError } from "../../shared/errors/httpErrors";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { formatZodError, paymentMethodIdParamSchema } from "./payment-methods.schema";
import * as paymentMethodsService from "./payment-methods.service";

export const listMyPaymentMethods: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.authUser) {
    throw new UnauthorizedError("No autorizado.", "UNAUTHENTICATED");
  }
  const result = await paymentMethodsService.listMyPaymentMethods(req.authUser);
  res.status(200).json(result);
});

export const createPaymentMethod: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.authUser) {
    throw new UnauthorizedError("No autorizado.", "UNAUTHENTICATED");
  }
  const result = await paymentMethodsService.createPaymentMethod(req.authUser, req.body);
  res.status(201).json(result);
});

export const disablePaymentMethod: RequestHandler = asyncHandler(async (req, res) => {
  const parsed = paymentMethodIdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    throw new ValidationError(formatZodError(parsed.error));
  }
  if (!req.authUser) {
    throw new UnauthorizedError("No autorizado.", "UNAUTHENTICATED");
  }
  const result = await paymentMethodsService.disablePaymentMethod(
    req.authUser,
    parsed.data.id
  );
  res.status(200).json(result);
});

export const updatePaymentMethodGuarantee: RequestHandler = asyncHandler(async (req, res) => {
  const parsed = paymentMethodIdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    throw new ValidationError(formatZodError(parsed.error));
  }
  if (!req.authUser) {
    throw new UnauthorizedError("No autorizado.", "UNAUTHENTICATED");
  }
  const result = await paymentMethodsService.updatePaymentMethodGuarantee(
    req.authUser,
    parsed.data.id,
    req.body
  );
  res.status(200).json(result);
});
