import { describe, it, expect, vi, beforeEach } from "vitest";
import * as authRepository from "../src/modules/auth/auth.repository";
import * as emailService from "../src/shared/email/email.service";
import { registerUser } from "../src/modules/auth/auth.service";

describe("Auth-2 — registerUser", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("crea credencial, envía correo y devuelve contrato con mensaje y usuario", async () => {
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
        fullName: "A B",
        email: "a@b.com",
        documentNumber: "1",
        countryId: 1,
      })
    ).rejects.toThrow("SMTP down");

    expect(delSpy).toHaveBeenCalledWith(99);
  });

  it("acepta nombre completo único sin first/last", async () => {
    vi.spyOn(authRepository, "createPersonaClienteCredential").mockResolvedValue({
      id: 2,
      documentNumber: "2",
      fullName: "María García",
      status: "activo",
      admitted: "no",
      category: "comun",
    });
    vi.spyOn(emailService, "sendTemporaryPasswordEmail").mockResolvedValue(undefined);

    await registerUser({
      fullName: "María García",
      email: "m@example.com",
      documentNumber: "2",
      countryId: 1,
      photoBase64: Buffer.from("x", "utf8").toString("base64"),
    });

    const call = vi.mocked(authRepository.createPersonaClienteCredential).mock.calls[0][0];
    expect(call.fullName).toBe("María García");
    expect(call.fotoBuffer).toEqual(Buffer.from(Buffer.from("x", "utf8").toString("base64"), "base64"));
  });
});
