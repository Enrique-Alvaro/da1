import { Router } from "express";
import { normalizeAuctionIdParam } from "../../shared/middlewares/normalizeAuctionIdParam";
import { requireAccessToken } from "../../shared/middlewares/requireAccessToken";
import { requireAuth } from "../../shared/middlewares/requireAuth";
import { requireClienteAuth } from "../../shared/middlewares/requireClienteAuth";
import { requireOperationalUser } from "../../shared/middlewares/requireOperationalUser";
import { optionalAuth } from "../../shared/middlewares/optionalAuth";
import { requireEmployeeAuth } from "../../shared/middlewares/requireEmployeeAuth";
import { postBid, registerAsistente } from "../pujos/pujos.controller";
import {
  closeAuctionItem,
  getAuctionItemResult,
} from "../subastas/subastas-closing.controller";
import {
  enterLiveSession,
  getBidHistory,
  getLiveState,
  getSubasta,
  getSubastaItems,
  leaveLiveSession,
  listSubastas,
} from "../subastas/subastas.controller";

/** English aliases — same handlers as `/api/subastas`. */
export const auctionsRoutes = Router();

auctionsRoutes.use(normalizeAuctionIdParam);

auctionsRoutes.get("/", optionalAuth, listSubastas);
auctionsRoutes.get("/:auctionId", optionalAuth, getSubasta);
auctionsRoutes.get("/:auctionId/items", optionalAuth, getSubastaItems);

const employeeChain = [requireAuth, requireAccessToken, requireEmployeeAuth] as const;

auctionsRoutes.post("/:auctionId/items/:itemId/close", ...employeeChain, closeAuctionItem);
auctionsRoutes.get(
  "/:auctionId/items/:itemId/result",
  requireAuth,
  requireAccessToken,
  getAuctionItemResult
);

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

auctionsRoutes.post("/:auctionId/asistentes", ...clientBidChain, registerAsistente);
auctionsRoutes.post("/:auctionId/bids", ...clientBidChain, postBid);
auctionsRoutes.post("/:auctionId/pujos", ...clientBidChain, postBid);
auctionsRoutes.get("/:auctionId/bids/history", ...clientOperationalChain, getBidHistory);

auctionsRoutes.post("/:auctionId/live/session", ...clientOperationalChain, enterLiveSession);
auctionsRoutes.delete("/:auctionId/live/session", ...clientOperationalChain, leaveLiveSession);
auctionsRoutes.get("/:auctionId/live", ...clientOperationalChain, getLiveState);
