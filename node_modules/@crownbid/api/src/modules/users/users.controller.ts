import { z } from "zod";
import type { RequestHandler } from "express";
import { UnauthorizedError, ValidationError } from "../../shared/errors/httpErrors";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import * as usersService from "./users.service";
import * as usersMetricsService from "./users-metrics.service";
import * as usersPurchasesService from "./users-purchases.service";
import * as usersMeStatusService from "./users-me-status.service";
import { formatZodError, myStatusQuerySchema } from "./users-me-status.schema";

const updateMeBodySchema = z.object({
  address: z.string().trim().max(300).nullable().optional(),
  email: z.string().trim().email("email inválido").max(200).optional(),
});

/** GET /api/users/me — requiere Bearer access token (no token de primer login). */
export const getMe: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.authUser) {
    throw new UnauthorizedError("No autorizado.");
  }

  const user = await usersService.getCurrentUser(req.authUser);
  res.status(200).json(user);
});

export const getMyMetrics: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.authUser) {
    throw new UnauthorizedError("No autorizado.");
  }
  const metrics = await usersMetricsService.getMyMetrics(req.authUser);
  res.status(200).json(metrics);
});

export const getMyOperationalStatus: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.authUser) {
    throw new UnauthorizedError("No autorizado.");
  }
  const parsed = myStatusQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new ValidationError(formatZodError(parsed.error));
  }
  const status = await usersMeStatusService.getMyOperationalStatus(
    req.authUser,
    parsed.data.auctionId
  );
  res.status(200).json(status);
});

export const getMyPurchases: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.authUser) {
    throw new UnauthorizedError("No autorizado.");
  }
  const result = await usersPurchasesService.listMyPurchases(req.authUser);
  res.status(200).json(result);
});

export const updateMe: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.authUser) {
    throw new UnauthorizedError("No autorizado.");
  }
  const parsed = updateMeBodySchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError(formatZodError(parsed.error));
  }
  const updated = await usersService.updateCurrentUser(req.authUser, parsed.data);
  res.status(200).json(updated);
});
