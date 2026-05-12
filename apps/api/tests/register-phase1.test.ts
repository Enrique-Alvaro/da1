import { describe, it, expect, vi, beforeEach } from "vitest";
import * as authRepository from "../src/modules/auth/auth.repository";
import * as emailService from "../src/shared/email/email.service";
import { ConflictError } from "../src/shared/errors/httpErrors";
import { registerUser } from "../src/modules/auth/auth.service";

describe("Auth-2 — registerUser", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("acepta contrato Figma (firstName, lastName, email, documento, país, imágenes)", async () => {
    vi.spyOn(authRepository, "createPersonaClienteCredential").mockResolvedValue({
      id: 7,
      documentNumber: "40123456",
      fullName: "Juan Pérez",
      status: "activo",
      admitted: "no",
      category: "comun",
    });
    const sendSpy = vi.spyOn(emailService, "sendTemporaryPasswordEmail").mockResolvedValue(undefined);

    const r = await registerUser({
      firstName: "Juan",
      lastName: "Pérez",
      email: "juan@example.com",
      documentNumber: "40123456",
      address: "Calle Principal 123",
      countryId: 1,
      documentFrontImageBase64: null,
      documentBackImageBase64: null,
    });

    expect(authRepository.createPersonaClienteCredential).toHaveBeenCalled();
    const call = vi.mocked(authRepository.createPersonaClienteCredential).mock.calls[0][0];
    expect(call.documentNumber).toBe("40123456");
    expect(call.fullName).toBe("Juan Pérez");
    expect(call.email).toBe("juan@example.com");
    expect(call.countryId).toBe(1);
    expect(call.fotoBuffer).toBeNull();
    expect(sendSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "juan@example.com",
        firstName: "Juan",
        temporaryPassword: expect.any(String),
      })
    );
    expect(r.emailSentTo).toBe("juan@example.com");
    expect(r.user).toMatchObject({
      id: 7,
      documentNumber: "40123456",
      fullName: "Juan Pérez",
      email: "juan@example.com",
      admitted: "no",
      category: "comun",
    });
    expect(r.message).toContain("contraseña temporal");
  });

  it("si falla el envío de correo, compensa borrando el registro", async () => {
    vi.spyOn(authRepository, "createPersonaClienteCredential").mockResolvedValue({
      id: 99,
      documentNumber: "1",
      fullName: "A B",
      status: "activo",
      admitted: "no",
      category: "comun",
    });
    vi.spyOn(emailService, "sendTemporaryPasswordEmail").mockRejectedValue(new Error("SMTP down"));
    const delSpy = vi.spyOn(authRepository, "deleteRegistrationCascade").mockResolvedValue(undefined);

    await expect(
      registerUser({
        firstName: "A",
        lastName: "B",
        email: "a@b.com",
        documentNumber: "1",
        countryId: 1,
      })
    ).rejects.toThrow("SMTP down");

    expect(delSpy).toHaveBeenCalledWith(99);
  });

  it("propaga conflicto por documento o email duplicado desde el repositorio", async () => {
    vi.spyOn(authRepository, "createPersonaClienteCredential").mockRejectedValue(
      new ConflictError("Ya existe un registro con ese correo electrónico o número de documento.")
    );

    await expect(
      registerUser({
        firstName: "María",
        lastName: "García",
        email: "m@example.com",
        documentNumber: "2",
        countryId: 1,
        photoBase64: Buffer.from("x", "utf8").toString("base64"),
      })
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("opcional fullName override y foto desde photoBase64", async () => {
    vi.spyOn(authRepository, "createPersonaClienteCredential").mockResolvedValue({
      id: 2,
      documentNumber: "2",
      fullName: "Nombre Legal Completo",
      status: "activo",
      admitted: "no",
      category: "comun",
    });
    vi.spyOn(emailService, "sendTemporaryPasswordEmail").mockResolvedValue(undefined);

    await registerUser({
      firstName: "María",
      lastName: "García",
      fullName: "Nombre Legal Completo",
      email: "m@example.com",
      documentNumber: "2",
      countryId: 1,
      photoBase64: Buffer.from("x", "utf8").toString("base64"),
    });

    const call = vi.mocked(authRepository.createPersonaClienteCredential).mock.calls[0][0];
    expect(call.fullName).toBe("Nombre Legal Completo");
    expect(call.fotoBuffer).toEqual(Buffer.from(Buffer.from("x", "utf8").toString("base64"), "base64"));
  });
});
