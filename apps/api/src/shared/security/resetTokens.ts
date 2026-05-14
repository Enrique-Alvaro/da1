import { createHash, randomBytes } from "crypto";

/** Cryptographically secure one-time reset secret (URL-safe). */
export function generatePasswordResetToken(): string {
  return randomBytes(32).toString("base64url");
}

/** SHA-256 hex digest for storage — never persist the raw token. */
export function hashPasswordResetToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
