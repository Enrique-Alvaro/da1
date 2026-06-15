import type { RequestHandler } from "express";
import { UnauthorizedError, ValidationError } from "../../shared/errors/httpErrors";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import * as notificationsService from "./notifications.service";
import {
  formatZodError,
  listNotificationsQuerySchema,
  notificationIdParamsSchema,
} from "./notifications.schema";

export const listMyNotifications: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.authUser) throw new UnauthorizedError("No autorizado.");
  const parsed = listNotificationsQuerySchema.safeParse(req.query);
  if (!parsed.success) throw new ValidationError(formatZodError(parsed.error));
  const result = await notificationsService.listMyNotifications(
    req.authUser,
    parsed.data.limit,
    parsed.data.offset
  );
  res.status(200).json(result);
});

export const getUnreadNotificationsCount: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.authUser) throw new UnauthorizedError("No autorizado.");
  const result = await notificationsService.getUnreadCount(req.authUser);
  res.status(200).json(result);
});

export const markNotificationRead: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.authUser) throw new UnauthorizedError("No autorizado.");
  const parsed = notificationIdParamsSchema.safeParse(req.params);
  if (!parsed.success) throw new ValidationError(formatZodError(parsed.error));
  const result = await notificationsService.markNotificationAsRead(
    req.authUser,
    parsed.data.notificationId
  );
  res.status(200).json(result);
});

export const markAllNotificationsRead: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.authUser) throw new UnauthorizedError("No autorizado.");
  const result = await notificationsService.markAllNotificationsAsRead(req.authUser);
  res.status(200).json(result);
});
