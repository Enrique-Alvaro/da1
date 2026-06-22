const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'http://localhost:3000/api';

/** Build absolute URL for catalog product photos served by the API. */
export function resolveProductImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const origin = API_BASE_URL.replace(/\/api$/, '');
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}

export const FALLBACK_ITEM_IMAGE = null;

const ALLOWED_SUBMISSION_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);

/** Normalize picker mime types to what the API accepts (jpeg/png/webp). */
export function normalizeSubmissionImageMime(mimeType: string | null | undefined): string {
  const normalized = (mimeType ?? 'image/jpeg').trim().toLowerCase();
  if (normalized === 'image/jpg') return 'image/jpeg';
  return normalized;
}

export function isAllowedSubmissionImageMime(mimeType: string): boolean {
  return ALLOWED_SUBMISSION_MIMES.has(normalizeSubmissionImageMime(mimeType));
}
