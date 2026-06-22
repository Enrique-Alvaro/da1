import type { RequestHandler } from "express";
import { NotFoundError, ValidationError } from "../../shared/errors/httpErrors";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { formatZodError, productosIdParamSchema } from "./productos.schema";
import * as productosRepository from "./productos.repository";
import { z } from "zod";

const photoParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
  photoId: z.coerce.number().int().positive(),
});

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

/** Fotos públicas de productos aprobados (catálogo/subasta). Upload sigue solo vía envíos del cliente. */
export const getProductPhoto: RequestHandler = asyncHandler(async (req, res) => {
  const parsed = photoParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    throw new ValidationError(formatZodError(parsed.error));
  }
  const buffer = await productosRepository.findProductPhotoBuffer(
    parsed.data.id,
    parsed.data.photoId
  );
  if (!buffer) {
    throw new NotFoundError("Foto no encontrada.", "PHOTO_NOT_FOUND");
  }
  res.setHeader("Content-Type", "image/jpeg");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.status(200).send(buffer);
});
