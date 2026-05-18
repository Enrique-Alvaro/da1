import type { RequestHandler } from "express";
import { ValidationError } from "../../shared/errors/httpErrors";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import {
  adminDecisionBodySchema,
  auctionAssignmentBodySchema,
  createProductSubmissionBodySchema,
  formatZodError,
  productSubmissionIdParamSchema,
  productSubmissionPhotoParamsSchema,
} from "./productos-submissions.schema";
import * as submissionsService from "./productos-submissions.service";

export const createSubmission: RequestHandler = asyncHandler(async (req, res) => {
  const parsed = createProductSubmissionBodySchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError(formatZodError(parsed.error));
  }
  if (!req.authUser) {
    throw new ValidationError("No autorizado.");
  }
  const result = await submissionsService.createSubmission(req.authUser, parsed.data);
  res.status(201).json(result);
});

export const listMySubmissions: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.authUser) {
    throw new ValidationError("No autorizado.");
  }
  const result = await submissionsService.listMySubmissions(req.authUser);
  res.status(200).json(result);
});

export const getMySubmission: RequestHandler = asyncHandler(async (req, res) => {
  const parsed = productSubmissionIdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    throw new ValidationError(formatZodError(parsed.error));
  }
  if (!req.authUser) {
    throw new ValidationError("No autorizado.");
  }
  const result = await submissionsService.getMySubmission(req.authUser, parsed.data.id);
  res.status(200).json(result);
});

export const getMySubmissionPhoto: RequestHandler = asyncHandler(async (req, res) => {
  const parsed = productSubmissionPhotoParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    throw new ValidationError(formatZodError(parsed.error));
  }
  if (!req.authUser) {
    throw new ValidationError("No autorizado.");
  }
  const buffer = await submissionsService.getMySubmissionPhoto(
    req.authUser,
    parsed.data.id,
    parsed.data.photoId
  );
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Length", String(buffer.length));
  res.status(200).send(buffer);
});

export const cancelMySubmission: RequestHandler = asyncHandler(async (req, res) => {
  const parsed = productSubmissionIdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    throw new ValidationError(formatZodError(parsed.error));
  }
  if (!req.authUser) {
    throw new ValidationError("No autorizado.");
  }
  await submissionsService.cancelMySubmission(req.authUser, parsed.data.id);
  res.status(204).send();
});

export const listPendingReview: RequestHandler = asyncHandler(async (_req, res) => {
  const result = await submissionsService.listPendingForReview();
  res.status(200).json(result);
});

export const adminDecision: RequestHandler = asyncHandler(async (req, res) => {
  const parsedParams = productSubmissionIdParamSchema.safeParse(req.params);
  if (!parsedParams.success) {
    throw new ValidationError(formatZodError(parsedParams.error));
  }
  const parsedBody = adminDecisionBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    throw new ValidationError(formatZodError(parsedBody.error));
  }
  if (!req.authUser) {
    throw new ValidationError("No autorizado.");
  }
  const employeeId = submissionsService.assertEmployeeId(req.authUser);
  const result = await submissionsService.applyDecision(
    employeeId,
    parsedParams.data.id,
    parsedBody.data
  );
  res.status(200).json({
    ...result.detail,
    decisionApplied: result.decisionApplied,
    ...(result.limitations ? { limitations: result.limitations } : {}),
  });
});

export const auctionAssignment: RequestHandler = asyncHandler(async (req, res) => {
  const parsedParams = productSubmissionIdParamSchema.safeParse(req.params);
  if (!parsedParams.success) {
    throw new ValidationError(formatZodError(parsedParams.error));
  }
  const parsedBody = auctionAssignmentBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    throw new ValidationError(formatZodError(parsedBody.error));
  }
  if (!req.authUser) {
    throw new ValidationError("No autorizado.");
  }
  const employeeId = submissionsService.assertEmployeeId(req.authUser);
  const result = await submissionsService.assignToAuction(
    employeeId,
    parsedParams.data.id,
    parsedBody.data
  );
  res.status(200).json(result);
});
