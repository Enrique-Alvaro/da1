import { Router } from "express";
import { requireAccessToken } from "../../shared/middlewares/requireAccessToken";
import { requireAuth } from "../../shared/middlewares/requireAuth";
import { requireClienteAuth } from "../../shared/middlewares/requireClienteAuth";
import { requireOperationalUser } from "../../shared/middlewares/requireOperationalUser";
import { optionalAuth } from "../../shared/middlewares/optionalAuth";
import { getItem } from "./items.controller";
import {
  acceptMyTerms,
  createSolicitud,
  getMySolicitud,
  listMySolicitudes,
  rejectMyTerms,
} from "../productos/productos-submissions-api.controller";

export const itemsRoutes = Router();

const clientSubmissionChain = [
  requireAuth,
  requireAccessToken,
  requireClienteAuth,
  requireOperationalUser,
] as const;

itemsRoutes.post("/submissions", ...clientSubmissionChain, createSolicitud);
itemsRoutes.get("/my-submissions", ...clientSubmissionChain, listMySolicitudes);
itemsRoutes.get("/my-submissions/:id", ...clientSubmissionChain, getMySolicitud);
itemsRoutes.post("/my-submissions/:id/accept-terms", ...clientSubmissionChain, acceptMyTerms);
itemsRoutes.post("/my-submissions/:id/reject-terms", ...clientSubmissionChain, rejectMyTerms);

itemsRoutes.get("/:id", optionalAuth, getItem);
