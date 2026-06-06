import { ValidationError } from "../errors/httpErrors";

export const MIN_PRODUCT_IMAGES = 6;
export const MAX_PRODUCT_IMAGES = 20;
export const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

export type ProductImageInput = {
  filename: string;
  mimeType: string;
  base64: string;
};

function detectMime(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

export function parseProductImageBase64(input: ProductImageInput): Buffer {
  const mime = input.mimeType.trim().toLowerCase();
  if (!ALLOWED_MIME.has(mime)) {
    throw new ValidationError(
      `Tipo de imagen no permitido: ${input.mimeType}. Use image/jpeg, image/png o image/webp.`
    );
  }

  const raw = input.base64.trim();
  let b64 = raw;
  const dataUrl = /^data:([^;]+);base64,(.+)$/i.exec(raw);
  if (dataUrl) {
    b64 = dataUrl[2] ?? "";
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(b64, "base64");
  } catch {
    throw new ValidationError(`Imagen inválida (${input.filename}): Base64 corrupto.`);
  }

  if (buffer.length === 0) {
    throw new ValidationError(`Imagen inválida (${input.filename}): contenido vacío.`);
  }
  if (buffer.length > MAX_PRODUCT_IMAGE_BYTES) {
    throw new ValidationError(
      `Imagen demasiado grande (${input.filename}): máximo ${MAX_PRODUCT_IMAGE_BYTES} bytes.`
    );
  }

  const detected = detectMime(buffer);
  if (detected !== mime) {
    throw new ValidationError(
      `El contenido de ${input.filename} no coincide con mimeType ${input.mimeType}.`
    );
  }

  return buffer;
}

export function parseProductImages(images: ProductImageInput[]): Buffer[] {
  if (images.length < MIN_PRODUCT_IMAGES) {
    throw new ValidationError(`Se requieren al menos ${MIN_PRODUCT_IMAGES} imágenes.`);
  }
  if (images.length > MAX_PRODUCT_IMAGES) {
    throw new ValidationError(`Máximo ${MAX_PRODUCT_IMAGES} imágenes por envío.`);
  }
  return images.map(parseProductImageBase64);
}
