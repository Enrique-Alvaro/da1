import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DbUserRow, DbUserWithPasswordRow } from "../src/modules/auth/auth.types";
import { UnauthorizedError, GoneError } from "../src/shared/errors/httpErrors";
import { hashPassword } from "../src/shared/security/passwords";
import { requireAccessToken } from "../src/shared/middlewares/requireAccessToken";
import * as jwtMod from "../src/shared/security/jwt";

const mocks = vi.hoisted(() => ({
  findUserByEmailWithPassword: vi.fn(),
  findUserByIdWithPassword: vi.fn(),
  updateInitialPassword: vi.fn(),
  createPasswordResetToken: vi.fn(),
  findResetTokenByHash: vi.fn(),
  completePasswordReset: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));

vi.mock("../src/modules/auth/auth.repository", () => ({
  findUserByEmailWithPassword: mocks.findUserByEmailWithPassword,
  findUserByIdWithPassword: mocks.findUserByIdWithPassword,
  updateInitialPassword: mocks.updateInitialPassword,
}));

vi.mock("../src/modules/auth/password-reset.repository", () => ({
  createPasswordResetToken: mocks.createPasswordResetToken,
  findResetTokenByHash: mocks.findResetTokenByHash,
  completePasswordReset: mocks.completePasswordReset,
  cleanupExpiredPasswordResetTokens: vi.fn(),
}));

vi.mock("../src/shared/email/email.service", () => ({
  sendTemporaryPasswordEmail: vi.fn(),
  sendPasswordResetEmail: mocks.sendPasswordResetEmail,
}));

vi.mock("../src/modules/auth/revoked-token.repository", () => ({
  revokeToken: vi.fn(),
}));

import {
  loginUser,
  changeInitialPassword,
  forgotPassword,
  resetPassword,
} from "../src/modules/auth/auth.service";

function baseUserRow(overrides: Partial<DbUserWithPasswordRow>): DbUserWithPasswordRow {
  return {
    id: "550e8400-e29b-41d4-a716-446655440001",
    first_name: "QA",
    last_name: "User",
    email: "qa.user@example.com",
    password_hash: "$2a$04$placeholder",
    document_id: "123",
    address: "Addr",
    country_code: "AR",
    photo_url: null,
    document_front_image_url: "https://example.com/f.jpg",
    document_back_image_url: "https://example.com/b.jpg",
    category: "common",
    status: "pending_verification",
    requires_password_change: Buffer.from([0]),
    bidding_blocked_until_resolved: Buffer.from([0]),
    delinquent_win_id: null,
    account_service_suspended: Buffer.from([0]),
    ...overrides,
  };
}

describe("auth essentials", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loginUser", () => {
    it("returns generic UnauthorizedError when email unknown", async () => {
      mocks.findUserByEmailWithPassword.mockResolvedValue(null);
      await expect(
        loginUser({ email: "missing@example.com", password: "x" })
      ).rejects.toMatchObject({
        message: "Credenciales inválidas.",
        statusCode: 401,
      });
    });

    it("returns generic UnauthorizedError when password wrong", async () => {
      const hash = await hashPassword("CorrectPass123");
      mocks.findUserByEmailWithPassword.mockResolvedValue(
        baseUserRow({ password_hash: hash })
      );
      await expect(
        loginUser({ email: "qa.user@example.com", password: "WrongPass123" })
      ).rejects.toMatchObject({
        message: "Credenciales inválidas.",
      });
    });

    it("returns first-login shape when requires_password_change is set", async () => {
      const plain = "TempLogin123";
      const hash = await hashPassword(plain);
      mocks.findUserByEmailWithPassword.mockResolvedValue(
        baseUserRow({
          password_hash: hash,
          requires_password_change: Buffer.from([1]),
        })
      );

      const result = await loginUser({ email: "qa.user@example.com", password: plain });

      expect(result.accessToken).toBeTruthy();
      expect(result.mustChangePassword).toBe(true);
      expect(result.isFirstLogin).toBe(true);
      expect(result.user.requiresPasswordChange).toBe(true);
      expect(result.user).not.toHaveProperty("password_hash");
      expect(result.user).not.toHaveProperty("passwordHash");
    });
  });

  describe("changeInitialPassword", () => {
    it("returns normal session shape after success", async () => {
      const tempPw = "TempOld456";
      const tempHash = await hashPassword(tempPw);

      vi.spyOn(jwtMod, "verifyAccessToken").mockReturnValue({
        sub: "550e8400-e29b-41d4-a716-446655440001",
        email: "qa.user@example.com",
        type: "initial_password_change",
        jti: "test-jti",
        exp: Math.floor(Date.now() / 1000) + 3600,
        expiresAt: new Date(Date.now() + 3600_000),
      });
      vi.spyOn(jwtMod, "signAccessToken").mockReturnValue("signed-access-token");

      mocks.findUserByIdWithPassword.mockResolvedValue(
        baseUserRow({
          password_hash: tempHash,
          requires_password_change: Buffer.from([1]),
        })
      );

      const updatedRow: DbUserRow = {
        id: "550e8400-e29b-41d4-a716-446655440001",
        first_name: "QA",
        last_name: "User",
        email: "qa.user@example.com",
        document_id: "123",
        address: "Addr",
        country_code: "AR",
        photo_url: null,
        document_front_image_url: "https://example.com/f.jpg",
        document_back_image_url: "https://example.com/b.jpg",
        category: "common",
        status: "pending_verification",
        requires_password_change: Buffer.from([0]),
        bidding_blocked_until_resolved: Buffer.from([0]),
        delinquent_win_id: null,
        account_service_suspended: Buffer.from([0]),
      };
      mocks.updateInitialPassword.mockResolvedValue(updatedRow);

      const result = await changeInitialPassword({
        token: "jwt-from-client",
        currentPassword: tempPw,
        newPassword: "NewStrong456",
      });

      expect(result.mustChangePassword).toBe(false);
      expect(result.isFirstLogin).toBe(false);
      expect(result.user.requiresPasswordChange).toBe(false);
      expect(result.accessToken).toBe("signed-access-token");
    });
  });

  describe("requireAccessToken middleware", () => {
    it("rejects initial_password_change with 401-style error", () => {
      const next = vi.fn();
      requireAccessToken(
        {
          authUser: {
            id: "x",
            email: "a@b.com",
            tokenType: "initial_password_change",
            jti: "j",
            exp: 1,
            expiresAt: new Date(),
          },
        } as Parameters<typeof requireAccessToken>[0],
        {} as Parameters<typeof requireAccessToken>[1],
        next
      );
      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(UnauthorizedError);
      expect((err as UnauthorizedError).message).toContain("sesión normal");
    });
  });

  describe("forgotPassword", () => {
    const generic =
      "Si existe una cuenta para este correo, las instrucciones de restablecimiento fueron enviadas.";

    it("returns the same generic message when user does not exist", async () => {
      mocks.findUserByEmailWithPassword.mockResolvedValue(null);
      const r = await forgotPassword({ email: "nobody@example.com" });
      expect(r.message).toBe(generic);
      expect(mocks.createPasswordResetToken).not.toHaveBeenCalled();
    });

    it("returns the same generic message when user exists (no enumeration)", async () => {
      mocks.findUserByEmailWithPassword.mockResolvedValue(
        baseUserRow({ requires_password_change: Buffer.from([0]) })
      );
      mocks.createPasswordResetToken.mockResolvedValue(undefined);
      mocks.sendPasswordResetEmail.mockResolvedValue(undefined);

      const r = await forgotPassword({ email: "qa.user@example.com" });
      expect(r.message).toBe(generic);
      expect(mocks.createPasswordResetToken).toHaveBeenCalled();
      expect(mocks.sendPasswordResetEmail).toHaveBeenCalled();
    });
  });

  describe("resetPassword", () => {
    it("throws UnauthorizedError when token row not found", async () => {
      mocks.findResetTokenByHash.mockResolvedValue(null);
      await expect(
        resetPassword({ token: "invalid-token-value-here", password: "NewStrong789" })
      ).rejects.toMatchObject({
        message: "El token de restablecimiento es inválido o ya fue utilizado.",
      });
    });

    it("throws GoneError when token expired", async () => {
      mocks.findResetTokenByHash.mockResolvedValue({
        id: "550e8400-e29b-41d4-a716-446655440099",
        user_id: "550e8400-e29b-41d4-a716-446655440001",
        expires_at_utc: new Date(Date.now() - 60_000),
        used_at_utc: null,
      });
      await expect(
        resetPassword({ token: "some-valid-length-token-here", password: "NewStrong789" })
      ).rejects.toBeInstanceOf(GoneError);
    });
  });
});
