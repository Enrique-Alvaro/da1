import type { RequestHandler } from "express";
import {
  BadRequestError,
  UnauthorizedError,
  ValidationError,
} from "../../shared/errors/httpErrors";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import {
  adminPaymentMethodListQuerySchema,
  formatZodError,
  paymentMethodIdParamSchema,
  rejectPaymentMethodBodySchema,
} from "./payment-methods-admin.schema";
import * as adminService from "./payment-methods-admin.service";

export const listAdminPaymentMethods: RequestHandler = asyncHandler(async (req, res) => {
  const parsedQuery = adminPaymentMethodListQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    throw new ValidationError(formatZodError(parsedQuery.error));
  }
  if (!req.authUser) {
    throw new UnauthorizedError("No autorizado.", "UNAUTHENTICATED");
  }
  const result = await adminService.listPaymentMethodsForReview(
    req.authUser,
    parsedQuery.data
  );
  res.status(200).json(result);
});

export const verifyAdminPaymentMethod: RequestHandler = asyncHandler(async (req, res) => {
  const parsedParams = paymentMethodIdParamSchema.safeParse(req.params);
  if (!parsedParams.success) {
    throw new ValidationError(formatZodError(parsedParams.error));
  }
  if (!req.authUser) {
    throw new UnauthorizedError("No autorizado.", "UNAUTHENTICATED");
  }
  const result = await adminService.verifyPaymentMethod(
    req.authUser,
    parsedParams.data.id
  );
  res.status(200).json(result);
});

export const rejectAdminPaymentMethod: RequestHandler = asyncHandler(async (req, res) => {
  const parsedParams = paymentMethodIdParamSchema.safeParse(req.params);
  if (!parsedParams.success) {
    throw new ValidationError(formatZodError(parsedParams.error));
  }
  const parsedBody = rejectPaymentMethodBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    const reasonIssue = parsedBody.error.issues.find((i) => i.path[0] === "reason");
    if (reasonIssue?.code === "too_big") {
      throw new BadRequestError(
        formatZodError(parsedBody.error),
        "PAYMENT_METHOD_REJECTION_REASON_TOO_LONG"
      );
    }
    if (reasonIssue) {
      throw new BadRequestError(
        formatZodError(parsedBody.error),
        "PAYMENT_METHOD_REJECTION_REASON_REQUIRED"
      );
    }
    throw new ValidationError(formatZodError(parsedBody.error));
  }
  if (!req.authUser) {
    throw new UnauthorizedError("No autorizado.", "UNAUTHENTICATED");
  }
  const result = await adminService.rejectPaymentMethod(
    req.authUser,
    parsedParams.data.id,
    parsedBody.data
  );
  res.status(200).json(result);
});
