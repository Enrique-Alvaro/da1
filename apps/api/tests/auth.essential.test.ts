import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DbClientCredentialLoginRow } from "../src/modules/auth/auth.types";
import { UnauthorizedError, NotImplementedError } from "../src/shared/errors/httpErrors";
import { hashPassword } from "../src/shared/security/passwords";
import { requireAccessToken } from "../src/shared/middlewares/requireAccessToken";
import * as jwtMod from "../src/shared/security/jwt";

const mocks = vi.hoisted(() => ({
  findCredentialByEmailWithPassword: vi.fn(),
  findCredentialByPersonaIdWithPassword: vi.fn(),
  updateClienteCredencialAfterInitialPassword: vi.fn(),
}));

vi.mock("../src/modules/auth/auth.repository", () => ({
  findCredentialByEmailWithPassword: mocks.findCredentialByEmailWithPassword,
  findCredentialByPersonaIdWithPassword: mocks.findCredentialByPersonaIdWithPassword,
  updateClienteCredencialAfterInitialPassword: mocks.updateClienteCredencialAfterInitialPassword,
}));

vi.mock("../src/modules/users/users.repository", () => ({
  findProfileByPersonId: vi.fn(),
}));

import * as usersRepository from "../src/modules/users/users.repository";
import {
  loginUser,
  changeInitialPassword,
  forgotPassword,
  resetPassword,
  logout,
} from "../src/modules/auth/auth.service";

function baseCredentialRow(overrides: Partial<DbClientCredentialLoginRow>): DbClientCredentialLoginRow {
  return {
    persona_id: 7,
    email: "qa.user@example.com",
    password_hash: "$2a$04$placeholder",
    requires_password_change: Buffer.from([0]),
    document_number: "40123456",
    full_name: "QA User",
    address: "Addr",
    status: "activo",
    country_id: 1,
    country_name: "Argentina",
    admitted: "no",
    category: "comun",
    ...overrides,
  };
}

describe("auth essentials (Auth-2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loginUser", () => {
    it("returns generic UnauthorizedError when email unknown", async () => {
      mocks.findCredentialByEmailWithPassword.mockResolvedValue(null);
      await expect(loginUser({ email: "missing@example.com", password: "x" })).rejects.toMatchObject({
        message: "Credenciales inválidas.",
        statusCode: 401,
      });
    });

    it("returns generic UnauthorizedError when password wrong", async () => {
      const hash = await hashPassword("CorrectPass123");
      mocks.findCredentialByEmailWithPassword.mockResolvedValue(
        baseCredentialRow({ password_hash: hash })
      );
      await expect(loginUser({ email: "qa.user@example.com", password: "WrongPass123" })).rejects.toMatchObject({
        message: "Credenciales inválidas.",
      });
    });

    it("returns first-login shape when requires_password_change is set", async () => {
      const plain = "TempLogin123";
      const hash = await hashPassword(plain);
      mocks.findCredentialByEmailWithPassword.mockResolvedValue(
        baseCredentialRow({
          password_hash: hash,
          requires_password_change: Buffer.from([1]),
        })
      );

      const result = await loginUser({ email: "qa.user@example.com", password: plain });

      expect(result.accessToken).toBeTruthy();
      expect(result.mustChangePassword).toBe(true);
      expect(result.isFirstLogin).toBe(true);
      expect(result.user).not.toHaveProperty("password_hash");
      expect(result.user).not.toHaveProperty("passwordHash");
      expect(result.user.email).toBe("qa.user@example.com");
      expect(result.user.id).toBe(7);
      expect(result.user.country.id).toBe(1);
    });
  });

  describe("changeInitialPassword", () => {
    it("returns normal session shape after success", async () => {
      const tempPw = "TempOld456";
      const tempHash = await hashPassword(tempPw);

      vi.spyOn(jwtMod, "verifyAccessToken").mockReturnValue({
        sub: "7",
        email: "qa.user@example.com",
        type: "initial_password_change",
        jti: "test-jti",
        exp: Math.floor(Date.now() / 1000) + 3600,
        expiresAt: new Date(Date.now() + 3600_000),
      });
      vi.spyOn(jwtMod, "signAccessToken").mockReturnValue("signed-access-token");

      mocks.findCredentialByPersonaIdWithPassword.mockResolvedValue(
        baseCredentialRow({
          persona_id: 7,
          password_hash: tempHash,
          requires_password_change: Buffer.from([1]),
        })
      );

      mocks.updateClienteCredencialAfterInitialPassword.mockResolvedValue(1);

      vi.mocked(usersRepository.findProfileByPersonId).mockResolvedValue({
        id: 7,
        document_number: "40123456",
        full_name: "QA User",
        address: "Addr",
        status: "activo",
        country_id: 1,
        country_name: "Argentina",
        admitted: "no",
        category: "comun",
        email: "qa.user@example.com",
      });

      const result = await changeInitialPassword({
        token: "jwt-from-client",
        currentPassword: tempPw,
        newPassword: "NewStrong456",
      });

      expect(result.mustChangePassword).toBe(false);
      expect(result.isFirstLogin).toBe(false);
      expect(result.accessToken).toBe("signed-access-token");
      expect(result.user.email).toBe("qa.user@example.com");
      expect(mocks.updateClienteCredencialAfterInitialPassword).toHaveBeenCalled();
    });
  });

  describe("requireAccessToken middleware", () => {
    it("rejects initial_password_change with 401-style error", () => {
      const next = vi.fn();
      requireAccessToken(
        {
          authUser: {
            id: "7",
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

  describe("forgotPassword / resetPassword", () => {
    it("forgotPassword throws NotImplementedError", async () => {
      await expect(forgotPassword({ email: "any@example.com" })).rejects.toBeInstanceOf(NotImplementedError);
    });

    it("resetPassword throws NotImplementedError", async () => {
      await expect(
        resetPassword({ token: "some-valid-length-token-here", password: "NewStrong789" })
      ).rejects.toBeInstanceOf(NotImplementedError);
    });
  });

  describe("logout", () => {
    it("resolves without calling DB revocation", async () => {
      await expect(
        logout({
          id: "7",
          email: "a@b.com",
          tokenType: "access",
          jti: "jti-1",
          exp: 1,
          expiresAt: new Date(),
        })
      ).resolves.toBeUndefined();
    });
  });
});
