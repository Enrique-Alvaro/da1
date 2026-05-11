import { randomUUID } from "crypto";
import * as authRepository from "./auth.repository";
import type { RegisterBodyInput } from "./auth.schemas";
import { generateTemporaryPassword, hashPassword } from "../../shared/security/passwords";
import { sendTemporaryPasswordEmail } from "../../shared/email/email.service";
import { mapUserRowToApi } from "../users/user.mapper";
import { ConflictError, InternalServerError } from "../../shared/errors/httpErrors";

export type RegisterResult = {
  message: string;
  user: ReturnType<typeof mapUserRowToApi>;
  emailSentTo: string;
};

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
  } catch {
    await authRepository.deleteUserById(id);
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
