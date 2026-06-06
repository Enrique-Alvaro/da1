import { createHash, randomBytes } from "crypto";

/** Secreto de restablecimiento de un solo uso, criptográficamente seguro (URL-safe). */
export function generatePasswordResetToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Digesto SHA-256 en hex para almacenar — nunca persistir el token en claro. */
export function hashPasswordResetToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
