import type { RequestHandler } from "express";
import { ValidationError } from "../../shared/errors/httpErrors";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { empleadosIdParamSchema, formatZodError } from "./empleados.schema";
import * as empleadosRepository from "./empleados.repository";

export const listEmpleados: RequestHandler = asyncHandler(async (_req, res) => {
  const rows = await empleadosRepository.listEmpleados();
  res.status(200).json({ items: rows });
});

export const getEmpleado: RequestHandler = asyncHandler(async (req, res) => {
  const parsed = empleadosIdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    throw new ValidationError(formatZodError(parsed.error));
  }
  const row = await empleadosRepository.requireEmpleadoById(parsed.data.id);
  res.status(200).json(row);
});
