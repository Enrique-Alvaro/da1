import { describe, expect, it, vi, beforeEach } from "vitest";
import { ForbiddenError } from "../src/shared/errors/httpErrors";
import * as usersRepository from "../src/modules/users/users.repository";
import { requireAdmittedCliente } from "../src/shared/middlewares/requireAdmittedCliente";
import { createSubmission } from "../src/modules/productos/productos-submissions.service";
import type { AuthUserContext } from "../src/shared/types/auth";

const authCliente: AuthUserContext = {
  id: "7",
  email: "juan@example.com",
  tokenType: "access",
  role: "cliente",
  jti: "j1",
  exp: 9999999999,
  expiresAt: new Date(),
};

function mockReq(authUser?: AuthUserContext) {
  return {
    authUser,
  } as import("express").Request;
}

const mockRes = {} as import("express").Response;
const mockNext = vi.fn();

beforeEach(() => {
  vi.restoreAllMocks();
  mockNext.mockReset();
});

describe("requireAdmittedCliente middleware", () => {
  it("allows admitted client", async () => {
    vi.spyOn(usersRepository, "findClienteByPersonId").mockResolvedValue({
      identificador: 7,
      admitido: "si",
      categoria: "comun",
    });

    await requireAdmittedCliente(mockReq(authCliente), mockRes, mockNext);
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(mockNext).toHaveBeenCalledWith();
  });

  it("blocks non-admitted client with USER_NOT_ADMITTED", async () => {
    vi.spyOn(usersRepository, "findClienteByPersonId").mockResolvedValue({
      identificador: 7,
      admitido: "no",
      categoria: "comun",
    });

    await requireAdmittedCliente(mockReq(authCliente), mockRes, mockNext);
    await new Promise<void>((resolve) => setImmediate(resolve));
    const err = mockNext.mock.calls.find((call) => call[0])?.[0];
    expect(err).toBeInstanceOf(ForbiddenError);
    expect((err as ForbiddenError).code).toBe("USER_NOT_ADMITTED");
  });
});

describe("createSubmission admission guard", () => {
  it("rejects non-admitted client before creating product", async () => {
    vi.spyOn(usersRepository, "findClienteByPersonId").mockResolvedValue({
      identificador: 7,
      admitido: "no",
      categoria: "comun",
    });

    await expect(
      createSubmission(authCliente, {
        catalogDescription: "Demo",
        fullDescriptionUrl: "https://example.com/doc.pdf",
        images: Array.from({ length: 6 }, (_, i) => ({
          filename: `f${i}.jpg`,
          mimeType: "image/jpeg",
          base64: Buffer.from("abc").toString("base64"),
        })),
        declarations: {
          legitimateOwner: true,
          noLegalRestrictions: true,
          acceptsDocumentationRequest: true,
          acceptsReturnCostsIfRejected: true,
        },
      })
    ).rejects.toMatchObject({ code: "USER_NOT_ADMITTED" });
  });
});
