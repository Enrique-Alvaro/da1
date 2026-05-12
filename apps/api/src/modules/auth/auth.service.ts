import * as authRepository from "./auth.repository";
import type { ForgotPasswordBodyInput, LoginBodyInput, RegisterBodyInput, ResetPasswordBodyInput } from "./auth.schemas";
import { hashPassword, verifyPassword, generateTemporaryPassword } from "../../shared/security/passwords";
import { buildLoginTokenPayload, signAccessToken, verifyAccessToken } from "../../shared/security/jwt";
import { sendTemporaryPasswordEmail } from "../../shared/email/email.service";
import { mapCredentialLoginRowToUserPublic } from "../users/user.mapper";
import type { UserPublic } from "../users/user.mapper";
import type { AuthUserContext } from "../../shared/types/auth";
import * as usersRepository from "../users/users.repository";
import { mapPersonaClienteToUserPublic } from "../users/user.mapper";
import {
  ConflictError,
  NotImplementedError,
  UnauthorizedError,
} from "../../shared/errors/httpErrors";

export type RegisterSuccessUser = {
  id: number;
  documentNumber: string;
  fullName: string;
  email: string;
  address: string | null;
  status: string;
  admitted: "si" | "no";
  category: "comun" | "especial" | "plata" | "oro" | "platino";
};

export type RegisterResult = {
  message: string;
  user: RegisterSuccessUser;
  emailSentTo: string;
};

export type LoginResult = {
  accessToken: string;
  user: UserPublic;
  mustChangePassword: boolean;
  isFirstLogin: boolean;
};

function bit(v: boolean | Buffer | undefined): boolean {
  if (Buffer.isBuffer(v)) {
    return v[0] === 1;
  }
  return Boolean(v);
}

function resolveFullName(body: RegisterBodyInput): string {
  if (body.fullName?.trim()) {
    return body.fullName.trim();
  }
  return `${body.firstName.trim()} ${body.lastName.trim()}`.trim();
}

function resolveFirstNameForEmail(body: RegisterBodyInput): string {
  return body.firstName.trim() || "Usuario";
}

function resolveFotoBuffer(body: RegisterBodyInput): Buffer | null {
  const front = body.documentFrontImageBase64;
  if (front != null && typeof front === "string" && front.trim().length > 0) {
    return Buffer.from(front.trim(), "base64");
  }
  if (body.photoBase64 != null && typeof body.photoBase64 === "string" && body.photoBase64.trim().length > 0) {
    return Buffer.from(body.photoBase64.trim(), "base64");
  }
  return null;
}

/**
 * Registro: personas + clientes + credencial; contraseña temporal por correo.
 * El dorso del documento (documentBackImageBase64) no se persiste en el esquema actual (solo una foto en personas).
 */
export async function registerUser(body: RegisterBodyInput): Promise<RegisterResult> {
  const fullName = resolveFullName(body);
  const email = body.email;
  const address =
    body.address === null || body.address === undefined
      ? null
      : body.address.trim() === ""
        ? null
        : body.address.trim();

  const tempPlain = generateTemporaryPassword();
  const tempHash = await hashPassword(tempPlain);

  const created = await authRepository.createPersonaClienteCredential({
    documentNumber: body.documentNumber.trim(),
    fullName,
    address,
    countryId: body.countryId,
    fotoBuffer: resolveFotoBuffer(body),
    email,
    passwordHash: tempHash,
  });

  try {
    await sendTemporaryPasswordEmail({
      to: email,
      firstName: resolveFirstNameForEmail(body),
      temporaryPassword: tempPlain,
    });
  } catch (err) {
    await authRepository.deleteRegistrationCascade(created.id);
    throw err;
  }

  return {
    message:
      "Se envió una contraseña temporal al correo indicado. Revisá tu casilla para continuar el registro.",
    emailSentTo: email,
    user: {
      id: created.id,
      documentNumber: created.documentNumber,
      fullName: created.fullName,
      email,
      address,
      status: created.status,
      admitted: created.admitted,
      category: created.category,
    },
  };
}

/**
 * Login por email + contraseña; JWT stateless con sub = id de persona (string decimal).
 */
export async function loginUser(body: LoginBodyInput): Promise<LoginResult> {
  const row = await authRepository.findCredentialByEmailWithPassword(body.email);
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
    personaId: row.persona_id,
    email: row.email,
    tokenType,
  });
  const accessToken = signAccessToken(payload);

  return {
    accessToken,
    user: mapCredentialLoginRowToUserPublic(row),
    mustChangePassword,
    isFirstLogin,
  };
}

/**
 * Primer acceso: Bearer `initial_password_change`, define contraseña definitiva.
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

  const personaId = Number.parseInt(payload.sub, 10);
  if (!Number.isSafeInteger(personaId) || personaId <= 0) {
    throw new UnauthorizedError("No autorizado.");
  }

  const row = await authRepository.findCredentialByPersonaIdWithPassword(personaId);
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
  const affected = await authRepository.updateClienteCredencialAfterInitialPassword({
    personaId,
    newPasswordHash: newHash,
  });

  if (affected < 1) {
    throw new ConflictError("El usuario ya completó el cambio inicial de contraseña.");
  }

  const profile = await usersRepository.findProfileByPersonId(personaId);
  if (!profile) {
    throw new UnauthorizedError("No autorizado.");
  }

  const accessPayload = buildLoginTokenPayload({
    personaId,
    email: row.email,
    tokenType: "access",
  });
  const accessToken = signAccessToken(accessPayload);

  return {
    accessToken,
    user: mapPersonaClienteToUserPublic(profile),
    mustChangePassword: false,
    isFirstLogin: false,
  };
}

/** Logout stateless: el cliente descarta el token; no hay revocación en servidor. */
export async function logout(_ctx: AuthUserContext): Promise<void> {
  return;
}

export async function forgotPassword(_input: ForgotPasswordBodyInput): Promise<{ message: string }> {
  throw new NotImplementedError(
    "El restablecimiento de contraseña por correo no está disponible en esta versión."
  );
}

export async function resetPassword(_input: ResetPasswordBodyInput): Promise<LoginResult> {
  throw new NotImplementedError(
    "El restablecimiento de contraseña por token no está disponible en esta versión."
  );
}
