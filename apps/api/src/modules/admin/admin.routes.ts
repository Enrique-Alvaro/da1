import { Router } from "express";
import { requireAccessToken } from "../../shared/middlewares/requireAccessToken";
import { requireAuth } from "../../shared/middlewares/requireAuth";
import { requireEmployeeAuth } from "../../shared/middlewares/requireEmployeeAuth";
import {
  adminDecision,
  auctionAssignment,
  listPendingReview,
} from "../productos/productos-submissions.controller";
import {
  acceptAdminSolicitud,
  assignAdminSolicitud,
  getAdminSolicitud,
  listAdminSolicitudes,
  rejectAdminSolicitud,
} from "../productos/productos-submissions-api.controller";
import {
  listAdminPaymentMethods,
  rejectAdminPaymentMethod,
  verifyAdminPaymentMethod,
} from "../payment-methods/payment-methods-admin.controller";
import { admitCliente, getAdminCliente, listAdminClientes } from "./admin-clients.controller";
import { createAuction, patchAuction } from "./admin-auctions.controller";

export const adminRoutes = Router();

adminRoutes.use(requireAuth, requireAccessToken, requireEmployeeAuth);

adminRoutes.get("/clientes", listAdminClientes);
adminRoutes.get("/clients", listAdminClientes);
adminRoutes.get("/clientes/:id", getAdminCliente);
adminRoutes.patch("/clientes/:id/admitir", admitCliente);
adminRoutes.patch("/clients/:id/admit", admitCliente);

adminRoutes.get("/payment-methods", listAdminPaymentMethods);
adminRoutes.patch("/payment-methods/:id/verify", verifyAdminPaymentMethod);
adminRoutes.patch("/payment-methods/:id/reject", rejectAdminPaymentMethod);

adminRoutes.get("/productos/solicitudes", listAdminSolicitudes);
adminRoutes.get("/productos/solicitudes/:id", getAdminSolicitud);
adminRoutes.post("/productos/solicitudes/:id/aceptar", acceptAdminSolicitud);
adminRoutes.post("/productos/solicitudes/:id/rechazar", rejectAdminSolicitud);
adminRoutes.post("/productos/solicitudes/:id/asignar-subasta", assignAdminSolicitud);

adminRoutes.get("/items/submissions", listAdminSolicitudes);
adminRoutes.get("/items/submissions/:id", getAdminSolicitud);
adminRoutes.post("/items/submissions/:id/accept", acceptAdminSolicitud);
adminRoutes.post("/items/submissions/:id/reject", rejectAdminSolicitud);
adminRoutes.post("/items/submissions/:id/assign-auction", assignAdminSolicitud);

adminRoutes.get("/productos/revision", listPendingReview);
adminRoutes.post("/productos/:id/decision", adminDecision);
adminRoutes.patch("/productos/:id/auction-assignment", auctionAssignment);

adminRoutes.post("/subastas", createAuction);
adminRoutes.post("/auctions", createAuction);
adminRoutes.patch("/subastas/:id", patchAuction);
adminRoutes.patch("/auctions/:id", patchAuction);
