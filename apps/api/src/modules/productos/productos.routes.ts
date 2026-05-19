import { Router } from "express";
import { requireAccessToken } from "../../shared/middlewares/requireAccessToken";
import { requireAuth } from "../../shared/middlewares/requireAuth";
import { requireClienteAuth } from "../../shared/middlewares/requireClienteAuth";
import { requireOperationalUser } from "../../shared/middlewares/requireOperationalUser";
import { getProducto, listProductos } from "./productos.controller";
import { createSubmission } from "./productos-submissions.controller";

export const productosRoutes = Router();

productosRoutes.use(requireAuth, requireAccessToken);

productosRoutes.post(
  "/submissions",
  requireClienteAuth,
  requireOperationalUser,
  createSubmission
);

productosRoutes.get("/", listProductos);
productosRoutes.get("/:id", getProducto);
