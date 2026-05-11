import type { RequestHandler } from "express";
import { UnauthorizedError } from "../../shared/errors/httpErrors";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import * as usersService from "./users.service";

/** GET /api/users/me — requires Bearer access token (not first-login token). */
export const getMe: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.authUser) {
    throw new UnauthorizedError("No autorizado.");
  }

  const user = await usersService.getCurrentUser(req.authUser);
  res.status(200).json(user);
});
