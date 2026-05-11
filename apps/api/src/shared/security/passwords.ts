import { randomInt } from "crypto";
import bcrypt from "bcryptjs";
import { getEnv } from "../../config/env";

const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnopqrstuvwxyz";
const DIGITS = "23456789";
const SYMBOLS = "@#$%&*";

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Cryptographically secure temporary password (≥10 chars, upper, lower, digit).
 */
export function generateTemporaryPassword(): string {
  const length = 12;
  const chars: string[] = [];
  chars.push(UPPER[randomInt(UPPER.length)]);
  chars.push(LOWER[randomInt(LOWER.length)]);
  chars.push(DIGITS[randomInt(DIGITS.length)]);
  const alphabet = UPPER + LOWER + DIGITS + SYMBOLS;
  for (let i = chars.length; i < length; i++) {
    chars.push(alphabet[randomInt(alphabet.length)]);
  }
  return shuffle(chars).join("");
}

export async function hashPassword(password: string): Promise<string> {
  const env = getEnv();
  const rounds = env.BCRYPT_SALT_ROUNDS ?? 12;
  return bcrypt.hash(password, rounds);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
