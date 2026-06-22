import { Router } from "express";
import { requireAccessToken } from "../../shared/middlewares/requireAccessToken";
import { requireAuth } from "../../shared/middlewares/requireAuth";
import { requireClienteAuth } from "../../shared/middlewares/requireClienteAuth";
import { requireClienteOrEmployeeAuth } from "../../shared/middlewares/requireClienteOrEmployeeAuth";
import {
  requireAdmittedClienteUnlessEmployee,
  requireOperationalUserUnlessEmployee,
} from "../../shared/middlewares/requireOperationalUnlessEmployee";
import { requireOperationalUser } from "../../shared/middlewares/requireOperationalUser";
import { requireAdmittedCliente } from "../../shared/middlewares/requireAdmittedCliente";
import { optionalAuth } from "../../shared/middlewares/optionalAuth";
import { postBid, registerAsistente } from "../pujos/pujos.controller";
import { requireEmployeeAuth } from "../../shared/middlewares/requireEmployeeAuth";
import {
  closeAuctionItem,
  getAuctionItemResult,
} from "./subastas-closing.controller";
import {
  enterLiveSession,
  getBidHistory,
  getLiveState,
  getSubasta,
  getSubastaItems,
  leaveLiveSession,
  listSubastas,
} from "./subastas.controller";

export const subastasRoutes = Router();

subastasRoutes.get("/", optionalAuth, listSubastas);
subastasRoutes.get("/:id", optionalAuth, getSubasta);
subastasRoutes.get("/:id/items", optionalAuth, getSubastaItems);

const employeeChain = [requireAuth, requireAccessToken, requireEmployeeAuth] as const;

subastasRoutes.post("/:id/items/:itemId/cerrar", ...employeeChain, closeAuctionItem);
subastasRoutes.get("/:id/items/:itemId/resultado", requireAuth, requireAccessToken, getAuctionItemResult);

const clientAdmittedOperationalChain = [
  requireAuth,
  requireAccessToken,
  requireClienteAuth,
  requireOperationalUser,
  requireAdmittedCliente,
] as const;

const operationalReadChain = [
  requireAuth,
  requireAccessToken,
  requireClienteOrEmployeeAuth,
  requireOperationalUserUnlessEmployee,
  requireAdmittedClienteUnlessEmployee,
] as const;

subastasRoutes.post("/:id/asistentes", ...clientAdmittedOperationalChain, registerAsistente);
subastasRoutes.post("/:id/pujos", ...clientAdmittedOperationalChain, postBid);
subastasRoutes.get("/:id/pujos/history", ...operationalReadChain, getBidHistory);
subastasRoutes.get("/:id/bids/history", ...operationalReadChain, getBidHistory);

subastasRoutes.post("/:id/live/session", ...clientAdmittedOperationalChain, enterLiveSession);
subastasRoutes.delete("/:id/live/session", ...clientAdmittedOperationalChain, leaveLiveSession);
subastasRoutes.get("/:id/live", ...operationalReadChain, getLiveState);
