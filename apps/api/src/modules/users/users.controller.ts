import type { RequestHandler } from "express";
import { UnauthorizedError } from "../../shared/errors/httpErrors";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import * as usersService from "./users.service";
import * as usersMetricsService from "./users-metrics.service";
import * as usersPurchasesService from "./users-purchases.service";

/** GET /api/users/me — requires Bearer access token (not first-login token). */
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

export const getMyPurchases: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.authUser) {
    throw new UnauthorizedError("No autorizado.");
  }
  const result = await usersPurchasesService.listMyPurchases(req.authUser);
  res.status(200).json(result);
});
