import type { RequestHandler } from "express";
import { ValidationError } from "../../shared/errors/httpErrors";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import {
  admitClienteBodySchema,
  clientIdParamSchema,
  formatZodError,
} from "./admin-clients.schema";
import * as adminClientsService from "./admin-clients.service";

export const getAdminCliente: RequestHandler = asyncHandler(async (req, res) => {
  const parsed = clientIdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    throw new ValidationError(formatZodError(parsed.error));
  }
  const result = await adminClientsService.getAdminClientDetail(parsed.data.id);
  res.status(200).json(result);
});

export const admitCliente: RequestHandler = asyncHandler(async (req, res) => {
  const parsedParams = clientIdParamSchema.safeParse(req.params);
  if (!parsedParams.success) {
    throw new ValidationError(formatZodError(parsedParams.error));
  }
  const parsedBody = admitClienteBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    throw new ValidationError(formatZodError(parsedBody.error));
  }
  const result = await adminClientsService.admitCliente(parsedParams.data.id, parsedBody.data);
  res.status(200).json(result);
});
