import { Router } from "express";
import { requireAccessToken } from "../../shared/middlewares/requireAccessToken";
import { requireAuth } from "../../shared/middlewares/requireAuth";
import { getProducto, listProductos } from "./productos.controller";

export const productosRoutes = Router();

productosRoutes.use(requireAuth, requireAccessToken);

productosRoutes.get("/", listProductos);
productosRoutes.get("/:id", getProducto);
