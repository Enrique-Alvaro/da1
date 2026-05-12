import type { DbClientCredentialLoginRow, DbPersonaClienteProfileRow } from "../auth/auth.types";

const CATEGORY_VALUES = ["comun", "especial", "plata", "oro", "platino"] as const;
export type UserCategory = (typeof CATEGORY_VALUES)[number];

/** Usuario unificado para login, perfil y middleware operacional. */
export type UserPublic = {
  id: number;
  documentNumber: string;
  fullName: string;
  email: string;
  address: string | null;
  status: string;
  country: {
    id: number;
    name: string;
  };
  admitted: "si" | "no";
  category: UserCategory;
};

function parseCategory(value: string): UserCategory {
  const v = value.trim().toLowerCase();
  if ((CATEGORY_VALUES as readonly string[]).includes(v)) {
    return v as UserCategory;
  }
  return "comun";
}

export function mapPersonaClienteToUserPublic(row: DbPersonaClienteProfileRow): UserPublic {
  const countryId = row.country_id ?? 0;
  const countryName = row.country_name?.trim() || "";
  const email = (row.email ?? "").trim();
  return {
    id: row.id,
    documentNumber: row.document_number,
    fullName: row.full_name,
    email,
    address: row.address,
    status: row.status,
    country: {
      id: countryId,
      name: countryName,
    },
    admitted: row.admitted === "si" ? "si" : "no",
    category: parseCategory(row.category),
  };
}

export function mapCredentialLoginRowToUserPublic(row: DbClientCredentialLoginRow): UserPublic {
  return mapPersonaClienteToUserPublic({
    id: row.persona_id,
    document_number: row.document_number,
    full_name: row.full_name,
    address: row.address,
    status: row.status,
    country_id: row.country_id,
    country_name: row.country_name,
    admitted: row.admitted,
    category: row.category,
    email: row.email,
  });
}
