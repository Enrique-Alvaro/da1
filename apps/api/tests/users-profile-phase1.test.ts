import { describe, it, expect, vi, beforeEach } from "vitest";
import { UnauthorizedError } from "../src/shared/errors/httpErrors";
import * as usersRepository from "../src/modules/users/users.repository";
import { getCurrentUser } from "../src/modules/users/users.service";
import { mapCredentialLoginRowToUserPublic } from "../src/modules/users/user.mapper";
import type { DbClientCredentialLoginRow } from "../src/modules/auth/auth.types";

describe("GET /users/me — perfil", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("devuelve perfil con email cuando el token subject es entero", async () => {
    vi.spyOn(usersRepository, "findProfileByPersonId").mockResolvedValue({
      id: 7,
      document_number: "40123456",
      full_name: "María García",
      address: "Calle Falsa 123",
      status: "activo",
      country_id: 1,
      country_name: "Argentina",
      admitted: "si",
      category: "plata",
      email: "maria@example.com",
    });

    const u = await getCurrentUser({
      id: "7",
      email: "ignored@example.com",
      tokenType: "access",
      jti: "jti",
      exp: Math.floor(Date.now() / 1000) + 60,
      expiresAt: new Date(),
    });

    expect(u).toEqual({
      id: 7,
      documentNumber: "40123456",
      fullName: "María García",
      email: "maria@example.com",
      address: "Calle Falsa 123",
      status: "activo",
      country: { id: 1, name: "Argentina" },
      admitted: "si",
      category: "plata",
    });

    const loginRow: DbClientCredentialLoginRow = {
      persona_id: 7,
      email: "maria@example.com",
      password_hash: "x",
      requires_password_change: Buffer.from([0]),
      document_number: "40123456",
      full_name: "María García",
      address: "Calle Falsa 123",
      status: "activo",
      country_id: 1,
      country_name: "Argentina",
      admitted: "si",
      category: "plata",
    };
    expect(Object.keys(u).sort()).toEqual(Object.keys(mapCredentialLoginRowToUserPublic(loginRow)).sort());
  });

  it("rechaza subject no numérico con UnauthorizedError", async () => {
    await expect(
      getCurrentUser({
        id: "not-a-number",
        email: "a@b.com",
        tokenType: "access",
        jti: "j",
        exp: 1,
        expiresAt: new Date(),
      })
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
