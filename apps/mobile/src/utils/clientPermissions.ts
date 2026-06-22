import { Alert } from 'react-native';

import { getAuthToken, getCurrentUser } from '@/services/api';
import type { UserProfile } from '@/services/types';

export const PENDING_ADMISSION_BANNER =
  'Tu cuenta aún no fue aprobada por el equipo. Podés ver subastas, pero no podés pujar ni enviar artículos.';

export const PENDING_ADMISSION_ACTION =
  'Tu cuenta está pendiente de validación. Podés ver subastas, pero no podés pujar ni enviar artículos todavía.';

export const LOGIN_REQUIRED_ACTION =
  'Debés iniciar sesión para realizar esta acción.';

export function isUserAdmitted(user: Pick<UserProfile, 'admitted'> | null | undefined): boolean {
  return user?.admitted === 'si';
}

export async function resolveClientSession(): Promise<{
  isGuest: boolean;
  user: UserProfile | null;
  isAdmitted: boolean;
}> {
  if (!getAuthToken()) {
    return { isGuest: true, user: null, isAdmitted: false };
  }
  try {
    const user = (await getCurrentUser()) as UserProfile;
    return {
      isGuest: false,
      user,
      isAdmitted: isUserAdmitted(user),
    };
  } catch {
    return { isGuest: false, user: null, isAdmitted: false };
  }
}

export function alertLoginRequired(onLogin: () => void) {
  Alert.alert('Inicio de sesión requerido', LOGIN_REQUIRED_ACTION, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Iniciar sesión', onPress: onLogin },
  ]);
}

export function alertPendingAdmission() {
  Alert.alert('Cuenta pendiente', PENDING_ADMISSION_ACTION, [{ text: 'Entendido' }]);
}
