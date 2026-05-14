import { describe, expect, it } from "vitest";
import { paisesCreateBodySchema, paisesUpdateBodySchema } from "../src/modules/paises/paises.schema";
import { sectoresCreateBodySchema } from "../src/modules/sectores/sectores.schema";

describe("CRUD Zod schemas", () => {
  it("accepts valid país create payload", () => {
    const parsed = paisesCreateBodySchema.safeParse({
      numero: 2,
      nombre: "Brasil",
      nombreCorto: "BR",
      capital: "Brasilia",
      nacionalidad: "Brasileña",
      idiomas: "Portugués",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects país create without numero", () => {
    const parsed = paisesCreateBodySchema.safeParse({
      nombre: "X",
      capital: "C",
      nacionalidad: "N",
      idiomas: "I",
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts país update payload", () => {
    const parsed = paisesUpdateBodySchema.safeParse({
      nombre: "Argentina",
      capital: "Buenos Aires",
      nacionalidad: "Argentina",
      idiomas: "Español",
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts sector create with optional FK", () => {
    const parsed = sectoresCreateBodySchema.safeParse({
      nombreSector: "Logística",
      codigoSector: "L1",
      responsableSector: 1,
    });
    expect(parsed.success).toBe(true);
  });
});
