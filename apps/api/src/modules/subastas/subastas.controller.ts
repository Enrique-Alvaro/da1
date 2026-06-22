import type { RequestHandler } from "express";
import { ValidationError } from "../../shared/errors/httpErrors";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import {
  formatZodError,
  listSubastasQuerySchema,
  liveStateQuerySchema,
  subastasIdParamSchema,
} from "./subastas.schema";
import * as subastasService from "./subastas.service";

export const listSubastas: RequestHandler = asyncHandler(async (req, res) => {
  const parsed = listSubastasQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new ValidationError(formatZodError(parsed.error));
  }
  const result = await subastasService.listAuctions(
    {
      featured: parsed.data.featured === "true",
      status: parsed.data.status,
      category: parsed.data.category,
    },
    req.authUser
  );
  res.status(200).json(result);
});

export const getSubasta: RequestHandler = asyncHandler(async (req, res) => {
  const parsed = subastasIdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    throw new ValidationError(formatZodError(parsed.error));
  }
  const result = await subastasService.getAuctionDetail(parsed.data.id, req.authUser);
  res.status(200).json(result);
});

export const getSubastaItems: RequestHandler = asyncHandler(async (req, res) => {
  const parsed = subastasIdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    throw new ValidationError(formatZodError(parsed.error));
  }
  const result = await subastasService.listAuctionItems(parsed.data.id, req.authUser);
  res.status(200).json(result);
});

export const enterLiveSession: RequestHandler = asyncHandler(async (req, res) => {
  const parsed = subastasIdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    throw new ValidationError(formatZodError(parsed.error));
  }
  if (!req.authUser) {
    throw new ValidationError("Autenticación requerida.");
  }
  const result = await subastasService.enterLiveSession(parsed.data.id, req.authUser);
  res.status(200).json(result);
});

export const leaveLiveSession: RequestHandler = asyncHandler(async (req, res) => {
  const parsed = subastasIdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    throw new ValidationError(formatZodError(parsed.error));
  }
  if (!req.authUser) {
    throw new ValidationError("Autenticación requerida.");
  }
  const result = await subastasService.leaveLiveSession(parsed.data.id, req.authUser);
  res.status(200).json(result);
});

export const getLiveState: RequestHandler = asyncHandler(async (req, res) => {
  const parsed = subastasIdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    throw new ValidationError(formatZodError(parsed.error));
  }
  if (!req.authUser) {
    throw new ValidationError("Autenticación requerida.");
  }
  const parsedQuery = liveStateQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    throw new ValidationError(formatZodError(parsedQuery.error));
  }
  const result = await subastasService.getLiveAuctionState(
    parsed.data.id,
    req.authUser,
    parsedQuery.data.watchedItemId
  );
  res.status(200).json(result);
});

export const getBidHistory: RequestHandler = asyncHandler(async (req, res) => {
  const parsed = subastasIdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    throw new ValidationError(formatZodError(parsed.error));
  }
  if (!req.authUser) {
    throw new ValidationError("Autenticación requerida.");
  }
  const itemIdRaw = req.query.itemId;
  const itemId =
    itemIdRaw !== undefined && itemIdRaw !== ""
      ? Number.parseInt(String(itemIdRaw), 10)
      : undefined;
  const result = await subastasService.getBidHistory(
    parsed.data.id,
    req.authUser,
    Number.isFinite(itemId) && itemId! > 0 ? itemId : undefined
  );
  res.status(200).json(result);
});
