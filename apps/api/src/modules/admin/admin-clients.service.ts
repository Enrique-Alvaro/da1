import { NotFoundError } from "../../shared/errors/httpErrors";
import type { UserCategory } from "../users/user.mapper";
import { notifyClientAdmitted } from "../notifications/notifications.events";
import * as usersRepository from "../users/users.repository";
import type { AdmitClienteBody, ListAdminClientsQuery } from "./admin-clients.schema";

function formatOptionalDate(value: Date | string | null): string | null {
  if (value == null) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
}

function mapAdminClientListItem(row: usersRepository.AdminClientListRow) {
  return {
    clienteId: row.identificador,
    fullName: row.full_name,
    email: row.email,
    documentNumber: row.document_number,
    countryName: row.country_name,
    admitido: row.admitido.trim().toLowerCase() === "si" ? "si" : "no",
    categoria: row.categoria?.trim().toLowerCase() ?? null,
    registeredAt: formatOptionalDate(row.registered_at),
    paymentMethods: {
      total: Number(row.payment_method_count ?? 0),
      verified: Number(row.verified_payment_method_count ?? 0),
    },
  };
}

export async function listAdminClients(query: ListAdminClientsQuery) {
  const rows = await usersRepository.listAdminClients(query);
  return {
    items: rows.map(mapAdminClientListItem),
  };
}

export async function getAdminClientDetail(clienteId: number) {
  const row = await usersRepository.findAdminClientDetail(clienteId);
  if (!row) {
    throw new NotFoundError("Cliente no encontrado.", "CLIENT_NOT_FOUND");
  }
  return {
    ...mapAdminClientListItem(row),
    status: row.status,
  };
}

export async function admitCliente(clienteId: number, body: AdmitClienteBody) {
  const updated = await usersRepository.updateClienteAdmission({
    clienteId,
    admitido: body.admitido,
    categoria: body.categoria,
  });
  if (body.admitido.trim().toLowerCase() === "si") {
    void notifyClientAdmitted({ clienteId: updated.identificador });
  }
  return {
    clienteId: updated.identificador,
    admitido: updated.admitido.trim().toLowerCase() === "si" ? "si" : "no",
    categoria: updated.categoria?.trim().toLowerCase() ?? null,
    updatedAt: new Date().toISOString(),
  };
}
