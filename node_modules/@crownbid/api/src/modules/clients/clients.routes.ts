import { Router } from "express";
import { requireAccessToken } from "../../shared/middlewares/requireAccessToken";
import { requireAuth } from "../../shared/middlewares/requireAuth";
import { requireClienteAuth } from "../../shared/middlewares/requireClienteAuth";
import { requireOperationalUser } from "../../shared/middlewares/requireOperationalUser";
import { getMyOperationalStatus } from "../users/users.controller";

export const clientsRoutes = Router();

const clientOperationalChain = [
  requireAuth,
  requireAccessToken,
  requireClienteAuth,
  requireOperationalUser,
] as const;

clientsRoutes.get("/me/status", ...clientOperationalChain, getMyOperationalStatus);
