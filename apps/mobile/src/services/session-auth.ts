import { Alert } from 'react-native';

export const SESSION_EXPIRED_MESSAGE = 'Tu sesión expiró. Iniciá sesión nuevamente.';

const AUTH_FORBIDDEN_CODES = new Set(['UNAUTHENTICATED', 'INVALID_TOKEN', 'TOKEN_EXPIRED']);

let sessionExpiredHandler: (() => void) | null = null;
let handlingSessionExpired = false;

export function registerSessionExpiredHandler(handler: (() => void) | null): void {
  sessionExpiredHandler = handler;
}

export function isPublicAuthPath(path: string): boolean {
  return (
    path === '/auth/login' ||
    path.startsWith('/auth/register') ||
    path === '/auth/forgot-password' ||
    path === '/auth/reset-password' ||
    path === '/auth/change-initial-password' ||
    path === '/auth/logout'
  );
}

export function shouldTriggerSessionExpiration(
  path: string,
  hadToken: boolean,
  statusCode: number,
  code?: string,
): boolean {
  if (!hadToken || isPublicAuthPath(path)) {
    return false;
  }
  if (statusCode === 401) {
    return true;
  }
  if (statusCode === 403 && code && AUTH_FORBIDDEN_CODES.has(code)) {
    return true;
  }
  return false;
}

export function isSessionExpirationError(error: { statusCode?: number; code?: string }): boolean {
  const statusCode = error.statusCode ?? 0;
  if (statusCode === 401) {
    return true;
  }
  if (statusCode === 403 && error.code && AUTH_FORBIDDEN_CODES.has(error.code)) {
    return true;
  }
  return false;
}

export async function triggerSessionExpired(
  clearSession: () => Promise<void>,
  options?: { showAlert?: boolean },
): Promise<void> {
  if (handlingSessionExpired) {
    return;
  }
  handlingSessionExpired = true;

  try {
    await clearSession();
    if (options?.showAlert !== false) {
      Alert.alert('Sesión expirada', SESSION_EXPIRED_MESSAGE, [{ text: 'OK' }]);
    }
    sessionExpiredHandler?.();
  } finally {
    setTimeout(() => {
      handlingSessionExpired = false;
    }, 1500);
  }
}
