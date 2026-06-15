import type { AuthUserContext } from "../../shared/types/auth";
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "../../shared/errors/httpErrors";
import { findClienteByPersonId } from "../users/users.repository";
import { mapNotificationRow } from "./notifications.mapper";
import * as notificationsRepository from "./notifications.repository";
import type {
  CreateNotificationInput,
  NotificationListResponse,
  NotificationPublic,
} from "./notifications.types";

async function resolveClienteId(authUser: AuthUserContext): Promise<number> {
  if (authUser.role === "empleado") {
    throw new ForbiddenError("Esta acción no está disponible para empleados.");
  }
  const personId = Number.parseInt(authUser.id, 10);
  if (!Number.isFinite(personId) || personId <= 0) {
    throw new UnauthorizedError("No autorizado.");
  }
  const cliente = await findClienteByPersonId(personId);
  if (!cliente) {
    throw new ForbiddenError("Cliente no encontrado.", "CLIENT_NOT_FOUND");
  }
  return cliente.identificador;
}

export async function listMyNotifications(
  authUser: AuthUserContext,
  limit = 50,
  offset = 0
): Promise<NotificationListResponse> {
  const clienteId = await resolveClienteId(authUser);
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const safeOffset = Math.max(offset, 0);
  const [{ rows, total }, unreadCount] = await Promise.all([
    notificationsRepository.listByCliente(clienteId, safeLimit, safeOffset),
    notificationsRepository.countUnreadByCliente(clienteId),
  ]);
  return {
    items: rows.map(mapNotificationRow),
    unreadCount,
    total,
    limit: safeLimit,
    offset: safeOffset,
  };
}

export async function getUnreadCount(authUser: AuthUserContext): Promise<{ unreadCount: number }> {
  const clienteId = await resolveClienteId(authUser);
  const unreadCount = await notificationsRepository.countUnreadByCliente(clienteId);
  return { unreadCount };
}

export async function markNotificationAsRead(
  authUser: AuthUserContext,
  notificationId: number
): Promise<NotificationPublic> {
  const clienteId = await resolveClienteId(authUser);
  const existing = await notificationsRepository.findByIdForCliente(clienteId, notificationId);
  if (!existing) {
    throw new NotFoundError("Notificación no encontrada.", "NOTIFICATION_NOT_FOUND");
  }
  if (!existing.leida) {
    await notificationsRepository.markRead(clienteId, notificationId);
  }
  const updated = await notificationsRepository.findByIdForCliente(clienteId, notificationId);
  if (!updated) {
    throw new NotFoundError("Notificación no encontrada.", "NOTIFICATION_NOT_FOUND");
  }
  return mapNotificationRow(updated);
}

export async function markAllNotificationsAsRead(
  authUser: AuthUserContext
): Promise<{ updated: number }> {
  const clienteId = await resolveClienteId(authUser);
  const updated = await notificationsRepository.markAllRead(clienteId);
  return { updated };
}

/** Best-effort: nunca debe fallar el flujo principal. */
export async function createNotificationSafe(input: CreateNotificationInput): Promise<void> {
  try {
    await notificationsRepository.insertNotification(input);
  } catch {
    /* notification failure must not break primary operations */
  }
}

export { createNotificationSafe as createNotification };
