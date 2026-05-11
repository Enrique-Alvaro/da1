import { randomUUID } from "crypto";
import * as authRepository from "./auth.repository";
import type { DbUserRow } from "./auth.types";
import type {
  ForgotPasswordBodyInput,
  LoginBodyInput,
  RegisterBodyInput,
  ResetPasswordBodyInput,
} from "./auth.schemas";
import { generateTemporaryPassword, hashPassword, verifyPassword } from "../../shared/security/passwords";
import { buildLoginTokenPayload, signAccessToken, verifyAccessToken } from "../../shared/security/jwt";
import { sendPasswordResetEmail, sendTemporaryPasswordEmail } from "../../shared/email/email.service";
import { getEnv, getPasswordResetTtlMinutes } from "../../config/env";
import {
  generatePasswordResetToken,
  hashPasswordResetToken,
} from "../../shared/security/resetTokens";
import * as passwordResetRepository from "./password-reset.repository";
import { mapUserRowToApi } from "../users/user.mapper";
import type { AuthUserContext } from "../../shared/types/auth";
import * as revokedTokenRepository from "./revoked-token.repository";
import {
  ConflictError,
  GoneError,
  InternalServerError,
  UnauthorizedError,
} from "../../shared/errors/httpErrors";

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

const FORGOT_PASSWORD_GENERIC_MESSAGE =
  "Si existe una cuenta para este correo, las instrucciones de restablecimiento fueron enviadas.";

function resolvePasswordResetLinkBase(): string {
  const env = getEnv();
  const trimmed = env.FRONTEND_URL?.trim();
  if (trimmed) {
    return trimmed.replace(/\/$/, "");
  }
  if (env.NODE_ENV === "production") {
    throw new InternalServerError(
      "FRONTEND_URL es obligatorio en producción para generar el enlace de restablecimiento de contraseña."
    );
  }
  return "http://localhost:3000";
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

/** Records JWT `jti` as revoked until token expiry (server-side logout). */
export async function logout(ctx: AuthUserContext): Promise<void> {
  if (!ctx.jti.trim()) {
    throw new UnauthorizedError("No autorizado.");
  }
  await revokedTokenRepository.revokeToken({
    tokenJti: ctx.jti,
    userId: ctx.id,
    expiresAt: ctx.expiresAt,
  });
}

/** Generic message always — no account enumeration. */
export async function forgotPassword(input: ForgotPasswordBodyInput): Promise<{ message: string }> {
  const email = input.email;
  const row = await authRepository.findUserByEmailWithPassword(email);

  if (!row) {
    return { message: FORGOT_PASSWORD_GENERIC_MESSAGE };
  }

  const base = resolvePasswordResetLinkBase();

  const rawToken = generatePasswordResetToken();
  const tokenHash = hashPasswordResetToken(rawToken);
  const ttlMs = getPasswordResetTtlMinutes() * 60 * 1000;
  const expiresAt = new Date(Date.now() + ttlMs);

  await passwordResetRepository.createPasswordResetToken({
    userId: row.id,
    tokenHash,
    expiresAt,
  });

  const resetUrl = `${base}/reset-password?token=${encodeURIComponent(rawToken)}`;

  try {
    await sendPasswordResetEmail({
      to: row.email,
      firstName: row.first_name.trim(),
      resetUrl,
    });
  } catch (error) {
    console.error("[auth/forgot-password] Email delivery failed", error);
    throw new InternalServerError(
      "No se pudo enviar el correo de restablecimiento. Intentá nuevamente más tarde."
    );
  }

  return { message: FORGOT_PASSWORD_GENERIC_MESSAGE };
}

export async function resetPassword(input: ResetPasswordBodyInput): Promise<LoginResult> {
  const tokenHash = hashPasswordResetToken(input.token);
  const rec = await passwordResetRepository.findResetTokenByHash(tokenHash);

  if (!rec) {
    throw new UnauthorizedError(
      "El token de restablecimiento es inválido o ya fue utilizado."
    );
  }

  if (rec.used_at_utc != null) {
    throw new UnauthorizedError(
      "El token de restablecimiento es inválido o ya fue utilizado."
    );
  }

  const now = new Date();
  if (rec.expires_at_utc <= now) {
    throw new GoneError("El token de restablecimiento expiró.");
  }

  const newHash = await hashPassword(input.password);
  const updated = await passwordResetRepository.completePasswordReset({
    userId: rec.user_id,
    passwordHash: newHash,
  });

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
