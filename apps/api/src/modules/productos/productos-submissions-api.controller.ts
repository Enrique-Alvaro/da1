import type { RequestHandler } from "express";
import { ValidationError } from "../../shared/errors/httpErrors";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import {
  adminAcceptSubmissionBodySchema,
  adminRejectSubmissionBodySchema,
  adminSubmissionsQuerySchema,
  assignSolicitudBodySchema,
  createSolicitudBodySchema,
  formatZodError,
  productSubmissionIdParamSchema,
} from "./productos-submissions.schema";
import * as apiService from "./productos-submissions-api.service";
import * as submissionsService from "./productos-submissions.service";

export const createSolicitud: RequestHandler = asyncHandler(async (req, res) => {
  const parsed = createSolicitudBodySchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError(formatZodError(parsed.error));
  }
  if (!req.authUser) {
    throw new ValidationError("No autorizado.");
  }
  const result = await apiService.createSolicitud(req.authUser, parsed.data);
  res.status(201).json(result);
});

export const listMySolicitudes: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.authUser) {
    throw new ValidationError("No autorizado.");
  }
  const items = await apiService.listMySolicitudesApi(req.authUser);
  res.status(200).json(items);
});

export const getMySolicitud: RequestHandler = asyncHandler(async (req, res) => {
  const parsed = productSubmissionIdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    throw new ValidationError(formatZodError(parsed.error));
  }
  if (!req.authUser) {
    throw new ValidationError("No autorizado.");
  }
  const result = await apiService.getMySolicitudApi(req.authUser, parsed.data.id);
  res.status(200).json(result);
});

export const acceptMyTerms: RequestHandler = asyncHandler(async (_req, _res) => {
  await apiService.acceptTermsApi();
});

export const rejectMyTerms: RequestHandler = asyncHandler(async (_req, _res) => {
  await apiService.rejectTermsApi();
});

export const listAdminSolicitudes: RequestHandler = asyncHandler(async (req, res) => {
  const parsed = adminSubmissionsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new ValidationError(formatZodError(parsed.error));
  }
  const items = await apiService.listAdminSolicitudesApi(parsed.data);
  res.status(200).json(items);
});

export const getAdminSolicitud: RequestHandler = asyncHandler(async (req, res) => {
  const parsed = productSubmissionIdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    throw new ValidationError(formatZodError(parsed.error));
  }
  const result = await apiService.getAdminSolicitudApi(parsed.data.id);
  res.status(200).json(result);
});

export const acceptAdminSolicitud: RequestHandler = asyncHandler(async (req, res) => {
  const parsedParams = productSubmissionIdParamSchema.safeParse(req.params);
  if (!parsedParams.success) {
    throw new ValidationError(formatZodError(parsedParams.error));
  }
  const parsedBody = adminAcceptSubmissionBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    throw new ValidationError(formatZodError(parsedBody.error));
  }
  if (!req.authUser) {
    throw new ValidationError("No autorizado.");
  }
  const employeeId = submissionsService.assertEmployeeId(req.authUser);
  const result = await apiService.acceptSolicitudApi(
    employeeId,
    parsedParams.data.id,
    parsedBody.data
  );
  res.status(200).json(result);
});

export const rejectAdminSolicitud: RequestHandler = asyncHandler(async (req, res) => {
  const parsedParams = productSubmissionIdParamSchema.safeParse(req.params);
  if (!parsedParams.success) {
    throw new ValidationError(formatZodError(parsedParams.error));
  }
  const parsedBody = adminRejectSubmissionBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    throw new ValidationError(formatZodError(parsedBody.error));
  }
  if (!req.authUser) {
    throw new ValidationError("No autorizado.");
  }
  const employeeId = submissionsService.assertEmployeeId(req.authUser);
  const result = await apiService.rejectSolicitudApi(employeeId, parsedParams.data.id, parsedBody.data);
  res.status(200).json(result);
});

export const assignAdminSolicitud: RequestHandler = asyncHandler(async (req, res) => {
  const parsedParams = productSubmissionIdParamSchema.safeParse(req.params);
  if (!parsedParams.success) {
    throw new ValidationError(formatZodError(parsedParams.error));
  }
  const parsedBody = assignSolicitudBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    throw new ValidationError(formatZodError(parsedBody.error));
  }
  if (!req.authUser) {
    throw new ValidationError("No autorizado.");
  }
  const employeeId = submissionsService.assertEmployeeId(req.authUser);
  const result = await apiService.assignSolicitudApi(
    employeeId,
    parsedParams.data.id,
    parsedBody.data
  );
  res.status(200).json(result);
});
