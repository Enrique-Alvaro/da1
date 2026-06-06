import { Router } from "express";
import { requireAccessToken } from "../../shared/middlewares/requireAccessToken";
import { requireAuth } from "../../shared/middlewares/requireAuth";
import { requireClienteAuth } from "../../shared/middlewares/requireClienteAuth";
import { requireOperationalUser } from "../../shared/middlewares/requireOperationalUser";
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

const clientOperationalChain = [
  requireAuth,
  requireAccessToken,
  requireClienteAuth,
  requireOperationalUser,
] as const;

const clientBidChain = [
  requireAuth,
  requireAccessToken,
  requireClienteAuth,
  requireOperationalUser,
] as const;

subastasRoutes.post("/:id/asistentes", ...clientBidChain, registerAsistente);
subastasRoutes.post("/:id/pujos", ...clientBidChain, postBid);
subastasRoutes.get("/:id/pujos/history", ...clientOperationalChain, getBidHistory);
subastasRoutes.get("/:id/bids/history", ...clientOperationalChain, getBidHistory);

subastasRoutes.post("/:id/live/session", ...clientOperationalChain, enterLiveSession);
subastasRoutes.delete("/:id/live/session", ...clientOperationalChain, leaveLiveSession);
subastasRoutes.get("/:id/live", ...clientOperationalChain, getLiveState);
