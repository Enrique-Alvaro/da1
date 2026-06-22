import { Router } from "express";
import { requireAccessToken } from "../../shared/middlewares/requireAccessToken";
import { requireAuth } from "../../shared/middlewares/requireAuth";
import { requireClienteAuth } from "../../shared/middlewares/requireClienteAuth";
import { requireOperationalUser } from "../../shared/middlewares/requireOperationalUser";
import { requireAdmittedCliente } from "../../shared/middlewares/requireAdmittedCliente";
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

usersRoutes.get("/me/payment-methods", ...clientOperationalChain, requireAdmittedCliente, listMyPaymentMethods);
usersRoutes.post("/me/payment-methods", ...clientOperationalChain, requireAdmittedCliente, createPaymentMethod);
usersRoutes.patch(
  "/me/payment-methods/:id/disable",
  ...clientOperationalChain,
  requireAdmittedCliente,
  disablePaymentMethod
);
usersRoutes.patch(
  "/me/payment-methods/:id/guarantee",
  ...clientOperationalChain,
  requireAdmittedCliente,
  updatePaymentMethodGuarantee
);

const submissionReadChain = [
  requireAuth,
  requireAccessToken,
  requireClienteAuth,
  requireOperationalUser,
] as const;

const submissionWriteChain = [
  requireAuth,
  requireAccessToken,
  requireClienteAuth,
  requireOperationalUser,
  requireAdmittedCliente,
] as const;

usersRoutes.get("/me/item-submissions", ...submissionReadChain, listMySubmissions);
usersRoutes.get(
  "/me/item-submissions/:id/photos/:photoId",
  ...submissionReadChain,
  getMySubmissionPhoto
);
usersRoutes.get("/me/item-submissions/:id", ...submissionReadChain, getMySubmission);
usersRoutes.delete("/me/item-submissions/:id", ...submissionWriteChain, cancelMySubmission);
