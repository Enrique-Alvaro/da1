import { NotFoundError } from "../../shared/errors/httpErrors";
import type { UserCategory } from "../users/user.mapper";
import * as usersRepository from "../users/users.repository";
import type { AdmitClienteBody } from "./admin-clients.schema";

function formatOptionalDate(value: Date | string | null): string | null {
  if (value == null) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
}

export async function getAdminClientDetail(clienteId: number) {
  const row = await usersRepository.findAdminClientDetail(clienteId);
  if (!row) {
    throw new NotFoundError("Cliente no encontrado.", "CLIENT_NOT_FOUND");
  }
  return {
    clienteId: row.identificador,
    fullName: row.full_name,
    email: row.email,
    documentNumber: row.document_number,
    status: row.status,
    countryName: row.country_name,
    admitido: row.admitido.trim().toLowerCase() === "si" ? "si" : "no",
    categoria: row.categoria.trim().toLowerCase() as UserCategory,
    registeredAt: formatOptionalDate(row.registered_at),
    paymentMethods: {
      total: Number(row.payment_method_count ?? 0),
      verified: Number(row.verified_payment_method_count ?? 0),
    },
  };
}

export async function admitCliente(clienteId: number, body: AdmitClienteBody) {
  const updated = await usersRepository.updateClienteAdmission({
    clienteId,
    admitido: body.admitido,
    categoria: body.categoria,
  });
  return {
    clienteId: updated.identificador,
    admitido: updated.admitido.trim().toLowerCase() === "si" ? "si" : "no",
    categoria: updated.categoria.trim().toLowerCase() as UserCategory,
    updatedAt: new Date().toISOString(),
  };
}
