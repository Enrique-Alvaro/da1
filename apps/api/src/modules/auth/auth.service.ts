import { randomUUID } from "crypto";
import * as authRepository from "./auth.repository";
import type { DbUserRow } from "./auth.types";
import type { LoginBodyInput, RegisterBodyInput } from "./auth.schemas";
import { generateTemporaryPassword, hashPassword, verifyPassword } from "../../shared/security/passwords";
import { buildLoginTokenPayload, signAccessToken, verifyAccessToken } from "../../shared/security/jwt";
import { sendTemporaryPasswordEmail } from "../../shared/email/email.service";
import { mapUserRowToApi } from "../users/user.mapper";
import { ConflictError, InternalServerError, UnauthorizedError } from "../../shared/errors/httpErrors";

export type RegisterResult = {
  message: string;
  user: ReturnType<typeof mapUserRowToApi>;
  emailSentTo: string;
};

export type LoginResult = {
  accessToken: string;
  user: ReturnType<typeof mapUserRowToApi>;
  mustChangePassword: boolean;
  isFirstLogin: boolean;
};

function bit(v: boolean | Buffer | undefined): boolean {
  if (Buffer.isBuffer(v)) {
    return v[0] === 1;
  }
  return Boolean(v);
}

/**
 * Login: verify password against password_hash (temporary or definitive).
 * Same generic error for unknown email / wrong password.
 */
export async function loginUser(body: LoginBodyInput): Promise<LoginResult> {
  const email = body.email;
  const row = await authRepository.findUserByEmailWithPassword(email);
  if (!row) {
    throw new UnauthorizedError("Credenciales inválidas.");
  }

  const valid = await verifyPassword(body.password, row.password_hash);
  if (!valid) {
    throw new UnauthorizedError("Credenciales inválidas.");
  }

  const mustChangePassword = bit(row.requires_password_change);
  const isFirstLogin = mustChangePassword;
  const tokenType = mustChangePassword ? "initial_password_change" : "access";

  const payload = buildLoginTokenPayload({
    userId: row.id,
    email: row.email,
    tokenType,
  });
  const accessToken = signAccessToken(payload);

  const { password_hash: _pw, ...withoutPassword } = row;
  return {
    accessToken,
    user: mapUserRowToApi(withoutPassword as DbUserRow),
    mustChangePassword,
    isFirstLogin,
  };
}

/**
 * First login flow: validate Bearer JWT (initial_password_change), set definitive password, issue access JWT.
 */
export async function changeInitialPassword(input: {
  token: string;
  currentPassword: string;
  newPassword: string;
}): Promise<LoginResult> {
  const payload = verifyAccessToken(input.token);

  if (payload.type === "access") {
    throw new ConflictError("El usuario ya completó el cambio inicial de contraseña.");
  }

  const row = await authRepository.findUserByIdWithPassword(payload.sub);
  if (!row) {
    throw new UnauthorizedError("No autorizado.");
  }

  if (row.email.toLowerCase() !== payload.email.toLowerCase()) {
    throw new UnauthorizedError("No autorizado.");
  }

  if (!bit(row.requires_password_change)) {
    throw new ConflictError("El usuario ya completó el cambio inicial de contraseña.");
  }

  const currentOk = await verifyPassword(input.currentPassword, row.password_hash);
  if (!currentOk) {
    throw new UnauthorizedError("La contraseña actual es incorrecta.");
  }

  const newHash = await hashPassword(input.newPassword);
  const updated = await authRepository.updateInitialPassword({
    userId: row.id,
    newPasswordHash: newHash,
  });

  if (!updated) {
    throw new ConflictError("El usuario ya completó el cambio inicial de contraseña.");
  }

  const accessPayload = buildLoginTokenPayload({
    userId: updated.id,
    email: updated.email,
    tokenType: "access",
  });
  const accessToken = signAccessToken(accessPayload);

  return {
    accessToken,
    user: mapUserRowToApi(updated),
    mustChangePassword: false,
    isFirstLogin: false,
  };
}

/**
 * Register: duplicate check → hash temp password → INSERT user → send email.
 * Email cannot live inside a SQL transaction; if SMTP fails after INSERT, the user row is deleted (compensating).
 */
export async function registerUser(body: RegisterBodyInput): Promise<RegisterResult> {
  const email = body.email;

  const existing = await authRepository.findUserByEmail(email);
  if (existing) {
    throw new ConflictError("El email ya está registrado.");
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  const id = randomUUID();

  const row = await authRepository.createUser({
    id,
    email,
    passwordHash,
    firstName: body.firstName.trim(),
    lastName: body.lastName.trim(),
    documentId: body.documentId.trim(),
    address: body.address.trim(),
    countryCode: body.country,
    documentFrontImageUrl: body.documentFrontImageUrl.trim(),
    documentBackImageUrl: body.documentBackImageUrl.trim(),
  });

  try {
    await sendTemporaryPasswordEmail({
      to: email,
      firstName: body.firstName.trim(),
      temporaryPassword,
    });
  } catch (error) {
    console.error("[auth/register] Temporary password email failed", error);

    try {
      await authRepository.deleteUserById(id);
    } catch (deleteError) {
      console.error("[auth/register] Failed to delete user after email failure", deleteError);
    }

    throw new InternalServerError(
      "No se pudo completar el registro: falló el envío del correo con la contraseña temporal. Intentá nuevamente más tarde."
    );
  }

  return {
    message:
      "Se envió una contraseña temporal al correo indicado. Revisá tu casilla para completar el primer acceso.",
    user: mapUserRowToApi(row),
    emailSentTo: email,
  };
}
