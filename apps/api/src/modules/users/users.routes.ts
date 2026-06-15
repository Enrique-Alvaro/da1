import { Router } from "express";
import { requireAccessToken } from "../../shared/middlewares/requireAccessToken";
import { requireAuth } from "../../shared/middlewares/requireAuth";
import { requireClienteAuth } from "../../shared/middlewares/requireClienteAuth";
import { requireOperationalUser } from "../../shared/middlewares/requireOperationalUser";
import {
  cancelMySubmission,
  getMySubmission,
  getMySubmissionPhoto,
  listMySubmissions,
} from "../productos/productos-submissions.controller";
import {
  getMe,
  getMyMetrics,
  getMyOperationalStatus,
  getMyPurchases,
  updateMe,
} from "./users.controller";
import {
  getUnreadNotificationsCount,
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../notifications/notifications.controller";
import {
  createPaymentMethod,
  disablePaymentMethod,
  listMyPaymentMethods,
  updatePaymentMethodGuarantee,
} from "../payment-methods/payment-methods.controller";

export const usersRoutes = Router();

/** Contraseña definitiva (requireOperationalUser); no exige clientes.admitido = 'si'. */
const clientOperationalChain = [
  requireAuth,
  requireAccessToken,
  requireClienteAuth,
  requireOperationalUser,
] as const;

usersRoutes.get("/me", requireAuth, requireAccessToken, getMe);
usersRoutes.patch("/me", requireAuth, requireAccessToken, updateMe);
usersRoutes.get("/me/status", ...clientOperationalChain, getMyOperationalStatus);
usersRoutes.get("/me/metrics", requireAuth, requireAccessToken, getMyMetrics);
usersRoutes.get("/me/purchases", requireAuth, requireAccessToken, requireClienteAuth, getMyPurchases);

usersRoutes.get(
  "/me/notifications",
  requireAuth,
  requireAccessToken,
  requireClienteAuth,
  listMyNotifications
);
usersRoutes.get(
  "/me/notifications/unread-count",
  requireAuth,
  requireAccessToken,
  requireClienteAuth,
  getUnreadNotificationsCount
);
usersRoutes.patch(
  "/me/notifications/read-all",
  requireAuth,
  requireAccessToken,
  requireClienteAuth,
  markAllNotificationsRead
);
usersRoutes.patch(
  "/me/notifications/:notificationId/read",
  requireAuth,
  requireAccessToken,
  requireClienteAuth,
  markNotificationRead
);

usersRoutes.get("/me/payment-methods", ...clientOperationalChain, listMyPaymentMethods);
usersRoutes.post("/me/payment-methods", ...clientOperationalChain, createPaymentMethod);
usersRoutes.patch(
  "/me/payment-methods/:id/disable",
  ...clientOperationalChain,
  disablePaymentMethod
);
usersRoutes.patch(
  "/me/payment-methods/:id/guarantee",
  ...clientOperationalChain,
  updatePaymentMethodGuarantee
);

const submissionChain = [
  requireAuth,
  requireAccessToken,
  requireClienteAuth,
  requireOperationalUser,
] as const;

usersRoutes.get("/me/item-submissions", ...submissionChain, listMySubmissions);
usersRoutes.get(
  "/me/item-submissions/:id/photos/:photoId",
  ...submissionChain,
  getMySubmissionPhoto
);
usersRoutes.get("/me/item-submissions/:id", ...submissionChain, getMySubmission);
usersRoutes.delete("/me/item-submissions/:id", ...submissionChain, cancelMySubmission);
