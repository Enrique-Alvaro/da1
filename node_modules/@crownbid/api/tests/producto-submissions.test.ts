import { describe, expect, it } from "vitest";
import { deriveProductStatus } from "../src/modules/productos/producto-status";
import {
  auctionAssignmentBodySchema,
  createProductSubmissionBodySchema,
} from "../src/modules/productos/productos-submissions.schema";
import { MIN_PRODUCT_IMAGES } from "../src/shared/validation/productImages";

describe("deriveProductStatus", () => {
  it("pending_review when unavailable and not scheduled", () => {
    expect(
      deriveProductStatus({ disponible: "no", isScheduled: false, isSold: false })
    ).toBe("pending_review");
  });

  it("approved when available and not scheduled", () => {
    expect(
      deriveProductStatus({ disponible: "si", isScheduled: false, isSold: false })
    ).toBe("approved");
  });

  it("scheduled when in catalog", () => {
    expect(
      deriveProductStatus({ disponible: "si", isScheduled: true, isSold: false })
    ).toBe("scheduled");
  });

  it("sold takes precedence", () => {
    expect(
      deriveProductStatus({ disponible: "si", isScheduled: true, isSold: true })
    ).toBe("sold");
  });
});

describe("createProductSubmissionBodySchema", () => {
  const baseImage = {
    filename: "a.jpg",
    mimeType: "image/jpeg",
    base64: "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDAREAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=",
  };

  const validDeclarations = {
    legitimateOwner: true,
    noLegalRestrictions: true,
    acceptsDocumentationRequest: true,
    acceptsReturnCostsIfRejected: true,
  };

  it("rejects fewer than 6 images", () => {
    const parsed = createProductSubmissionBodySchema.safeParse({
      catalogDescription: "Reloj",
      fullDescriptionUrl: "https://example.com/doc.pdf",
      images: Array.from({ length: MIN_PRODUCT_IMAGES - 1 }, () => baseImage),
      declarations: validDeclarations,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects when a declaration is false", () => {
    const images = Array.from({ length: MIN_PRODUCT_IMAGES }, () => baseImage);
    const parsed = createProductSubmissionBodySchema.safeParse({
      catalogDescription: "Reloj",
      fullDescriptionUrl: "https://example.com/doc.pdf",
      images,
      declarations: { ...validDeclarations, legitimateOwner: false },
    });
    expect(parsed.success).toBe(false);
  });
});

describe("auctionAssignmentBodySchema", () => {
  it("rejects catalogId and subastaId together", () => {
    const parsed = auctionAssignmentBodySchema.safeParse({
      catalogId: 1,
      subastaId: 2,
      precioBase: 1000,
      comision: 10,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects when neither catalogId nor subastaId", () => {
    const parsed = auctionAssignmentBodySchema.safeParse({
      precioBase: 1000,
      comision: 10,
    });
    expect(parsed.success).toBe(false);
  });

  it("requires catalogDescription when only subastaId", () => {
    const parsed = auctionAssignmentBodySchema.safeParse({
      subastaId: 1,
      precioBase: 1000,
      comision: 10,
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts catalogId only", () => {
    const parsed = auctionAssignmentBodySchema.safeParse({
      catalogId: 1,
      precioBase: 1000,
      comision: 10,
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts subastaId with catalogDescription", () => {
    const parsed = auctionAssignmentBodySchema.safeParse({
      subastaId: 1,
      catalogDescription: "Catálogo mayo",
      precioBase: 1000,
      comision: 10,
    });
    expect(parsed.success).toBe(true);
  });
});
