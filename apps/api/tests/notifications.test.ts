import { describe, it, expect, vi, beforeEach } from "vitest";
import * as usersRepository from "../src/modules/users/users.repository";
import * as notificationsRepository from "../src/modules/notifications/notifications.repository";
import {
  getUnreadCount,
  listMyNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../src/modules/notifications/notifications.service";
import { mapNotificationRow } from "../src/modules/notifications/notifications.mapper";
import {
  formatUnreadBadge,
  getNotificationVisual,
  resolveNotificationNavigation,
} from "../../mobile/src/services/notification-mapper";
import type { AuthUserContext } from "../src/shared/types/auth";
import { ForbiddenError, NotFoundError } from "../src/shared/errors/httpErrors";

const authCliente: AuthUserContext = {
  id: "7",
  email: "juan@example.com",
  tokenType: "access",
  role: "cliente",
  jti: "j1",
  exp: 9999999999,
  expiresAt: new Date(),
};

const sampleRow = {
  identificador: 1,
  cliente: 7,
  tipo: "outbid",
  titulo: "Te han superado",
  mensaje: "Otro usuario pujó más.",
  leida: false,
  auctionId: 10,
  itemId: 3,
  saleId: null,
  paymentMethodId: null,
  submissionId: null,
  idempotencyKey: "outbid:3:7:99",
  creadoEn: new Date("2026-06-14T12:00:00.000Z"),
};

describe("Notifications service", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(usersRepository, "findClienteByPersonId").mockResolvedValue({
      identificador: 7,
      admitido: "si",
      categoria: "comun",
    });
  });

  it("listMyNotifications returns mapped items and unread count", async () => {
    vi.spyOn(notificationsRepository, "listByCliente").mockResolvedValue({
      rows: [sampleRow],
      total: 1,
    });
    vi.spyOn(notificationsRepository, "countUnreadByCliente").mockResolvedValue(1);

    const result = await listMyNotifications(authCliente, 50, 0);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].type).toBe("outbid");
    expect(result.unreadCount).toBe(1);
  });

  it("getUnreadCount resolves cliente and returns count", async () => {
    vi.spyOn(notificationsRepository, "countUnreadByCliente").mockResolvedValue(5);
    const result = await getUnreadCount(authCliente);
    expect(result.unreadCount).toBe(5);
  });

  it("markNotificationAsRead throws when notification missing", async () => {
    vi.spyOn(notificationsRepository, "findByIdForCliente").mockResolvedValue(null);
    await expect(markNotificationAsRead(authCliente, 999)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("markAllNotificationsAsRead returns updated count", async () => {
    vi.spyOn(notificationsRepository, "markAllRead").mockResolvedValue(3);
    const result = await markAllNotificationsAsRead(authCliente);
    expect(result.updated).toBe(3);
  });

  it("empleado cannot list notifications", async () => {
    const emp: AuthUserContext = { ...authCliente, role: "empleado" };
    await expect(listMyNotifications(emp)).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("Notification mapper", () => {
  it("mapNotificationRow maps DB row to API shape", () => {
    const mapped = mapNotificationRow(sampleRow);
    expect(mapped.id).toBe(1);
    expect(mapped.read).toBe(false);
    expect(mapped.createdAt).toBe("2026-06-14T12:00:00.000Z");
  });

  it("getNotificationVisual returns type-specific styling", () => {
    const visual = getNotificationVisual("auction_won");
    expect(visual.icon).toBe("🏆");
  });

  it("resolveNotificationNavigation routes custody updates to submissions", () => {
    const dest = resolveNotificationNavigation({
      id: 2,
      type: "submission_custody_updated",
      title: "Tu artículo fue actualizado",
      message: "msg",
      read: false,
      auctionId: null,
      itemId: null,
      saleId: null,
      paymentMethodId: null,
      submissionId: 100,
      createdAt: new Date().toISOString(),
    });
    expect(dest.type).toBe("submissions");
  });

  it("resolveNotificationNavigation routes outbid to live auction", () => {
    const dest = resolveNotificationNavigation({
      id: 1,
      type: "outbid",
      title: "Te han superado",
      message: "msg",
      read: false,
      auctionId: 10,
      itemId: 3,
      saleId: null,
      paymentMethodId: null,
      submissionId: null,
      createdAt: new Date().toISOString(),
    });
    expect(dest.type).toBe("live-auction");
    if (dest.type === "live-auction") {
      expect(dest.auctionId).toBe(10);
      expect(dest.itemId).toBe(3);
    }
  });

  it("formatUnreadBadge hides zero and caps at 99+", () => {
    expect(formatUnreadBadge(0)).toBeNull();
    expect(formatUnreadBadge(5)).toBe("5");
    expect(formatUnreadBadge(120)).toBe("99+");
  });
});
