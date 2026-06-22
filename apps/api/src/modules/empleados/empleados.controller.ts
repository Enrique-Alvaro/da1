import type { RequestHandler } from "express";
import { ForbiddenError, UnauthorizedError, ValidationError } from "../../shared/errors/httpErrors";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { empleadosIdParamSchema, formatZodError } from "./empleados.schema";
import * as empleadosRepository from "./empleados.repository";

export const listEmpleados: RequestHandler = asyncHandler(async (_req, res) => {
  const rows = await empleadosRepository.listEmpleados();
  res.status(200).json({ items: rows });
});

export const getEmpleadoMe: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.authUser || req.authUser.role !== "empleado") {
    throw new ForbiddenError("Se requiere sesión de empleado.");
  }
  const employeeId = req.authUser.employeeId;
  if (employeeId === undefined || employeeId <= 0) {
    throw new UnauthorizedError("No autorizado.");
  }
  const row = await empleadosRepository.requireEmpleadoById(employeeId);
  res.status(200).json({
    employeeId: row.identificador,
    email: req.authUser.email,
    role: "empleado",
    cargo: row.cargo,
    sector: row.sector,
  });
});

export const getEmpleado: RequestHandler = asyncHandler(async (req, res) => {
  const parsed = empleadosIdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    throw new ValidationError(formatZodError(parsed.error));
  }
  const row = await empleadosRepository.requireEmpleadoById(parsed.data.id);
  res.status(200).json(row);
});
