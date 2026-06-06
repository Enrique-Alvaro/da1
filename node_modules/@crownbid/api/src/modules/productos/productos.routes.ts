import { Router } from "express";
import { requireAccessToken } from "../../shared/middlewares/requireAccessToken";
import { requireAuth } from "../../shared/middlewares/requireAuth";
import { requireClienteAuth } from "../../shared/middlewares/requireClienteAuth";
import { requireOperationalUser } from "../../shared/middlewares/requireOperationalUser";
import { getProducto, listProductos } from "./productos.controller";
import { createSubmission } from "./productos-submissions.controller";
import {
  acceptMyTerms,
  createSolicitud,
  getMySolicitud,
  listMySolicitudes,
  rejectMyTerms,
} from "./productos-submissions-api.controller";

export const productosRoutes = Router();

productosRoutes.use(requireAuth, requireAccessToken);

const clientSubmissionChain = [
  requireClienteAuth,
  requireOperationalUser,
] as const;

productosRoutes.post("/solicitudes", ...clientSubmissionChain, createSolicitud);
productosRoutes.post("/submissions", ...clientSubmissionChain, createSubmission);
productosRoutes.get("/mis-solicitudes", ...clientSubmissionChain, listMySolicitudes);
productosRoutes.get("/mis-solicitudes/:id", ...clientSubmissionChain, getMySolicitud);
productosRoutes.post(
  "/mis-solicitudes/:id/aceptar-condiciones",
  ...clientSubmissionChain,
  acceptMyTerms
);
productosRoutes.post(
  "/mis-solicitudes/:id/rechazar-condiciones",
  ...clientSubmissionChain,
  rejectMyTerms
);

productosRoutes.get("/", listProductos);
productosRoutes.get("/:id", getProducto);
