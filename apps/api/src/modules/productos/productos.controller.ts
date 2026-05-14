import type { RequestHandler } from "express";
import { ValidationError } from "../../shared/errors/httpErrors";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { formatZodError, productosIdParamSchema } from "./productos.schema";
import * as productosRepository from "./productos.repository";

export const listProductos: RequestHandler = asyncHandler(async (_req, res) => {
  const rows = await productosRepository.listProductos();
  res.status(200).json({ items: rows });
});

export const getProducto: RequestHandler = asyncHandler(async (req, res) => {
  const parsed = productosIdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    throw new ValidationError(formatZodError(parsed.error));
  }
  const row = await productosRepository.requireProductoById(parsed.data.id);
  res.status(200).json(row);
});
