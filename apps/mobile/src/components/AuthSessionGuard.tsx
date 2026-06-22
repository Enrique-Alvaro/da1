import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';

import {
  clearAuthSession,
  getAuthToken,
  getCurrentUser,
  initAuthToken,
} from '@/services/api';
import {
  isSessionExpirationError,
  registerSessionExpiredHandler,
  triggerSessionExpired,
} from '@/services/session-auth';

export function AuthSessionGuard() {
  const router = useRouter();

  useEffect(() => {
    registerSessionExpiredHandler(() => {
      router.replace('/login');
    });
    return () => registerSessionExpiredHandler(null);
  }, [router]);

  useEffect(() => {
    void (async () => {
      await initAuthToken();
      const token = getAuthToken();
      if (!token) {
        return;
      }

      try {
        await getCurrentUser();
      } catch (error) {
        if (!isSessionExpirationError(error as { statusCode?: number; code?: string })) {
          return;
        }
        await triggerSessionExpired(clearAuthSession);
        router.replace('/login');
      }
    })();
  }, [router]);

  return null;
}
