import { Router } from "express";
import { requireAccessToken } from "../../shared/middlewares/requireAccessToken";
import { requireAuth } from "../../shared/middlewares/requireAuth";
import { requireClienteAuth } from "../../shared/middlewares/requireClienteAuth";
import { requireOperationalUser } from "../../shared/middlewares/requireOperationalUser";
import { postBid, registerAsistente } from "../pujos/pujos.controller";
import { getSubasta, listSubastas } from "./subastas.controller";

export const subastasRoutes = Router();

subastasRoutes.use(requireAuth, requireAccessToken);

const clientBidChain = [
  requireClienteAuth,
  requireOperationalUser,
] as const;

subastasRoutes.get("/", listSubastas);
subastasRoutes.post("/:id/asistentes", ...clientBidChain, registerAsistente);
subastasRoutes.post("/:id/pujos", ...clientBidChain, postBid);
subastasRoutes.get("/:id", getSubasta);
