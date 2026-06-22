import Constants from 'expo-constants';

import { readStoredToken, writeStoredToken } from './token-storage';
import {
  shouldTriggerSessionExpiration,
  triggerSessionExpired,
} from './session-auth';
import { normalizeEmail } from '../utils/email';
import {
  ApiError,
  AuthResponse,
  ItemFinalizationResult,
  LiveAuctionState,
  Notification,
  NotificationListResponse,
  PaymentMethod,
  PurchaseItem,
  UserMetrics,
  UserProfile,
} from './types';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ??
  'http://localhost:3000/api';

console.log('[CrownBid API_BASE_URL]', API_BASE_URL);

let authToken: string | null = null;
let tokenHydrated = false;

async function persistToken(token: string | null) {
  authToken = token;
  await writeStoredToken(token);
}

export async function initAuthToken(): Promise<void> {
  if (tokenHydrated) return;
  authToken = await readStoredToken();
  tokenHydrated = true;
}

export function loadStoredToken() {
  if (!authToken && typeof window !== 'undefined' && window.localStorage) {
    authToken = window.localStorage.getItem('crownbid_token');
  }
  return authToken;
}

export function getAuthToken() {
  return authToken ?? loadStoredToken();
}

export function setAuthToken(token: string | null) {
  void persistToken(token);
}

export async function setAuthTokenAsync(token: string | null) {
  await persistToken(token);
}

export async function clearAuthSession(): Promise<void> {
  authToken = null;
  tokenHydrated = true;
  await writeStoredToken(null);
}

function buildHeaders(contentType?: string) {
  const headers: Record<string, string> = {};
  if (contentType) {
    headers['Content-Type'] = contentType;
  }

  const token = getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) {
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers as HeadersInit | undefined);
  if (options.body != null && options.body !== '' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getAuthToken();
  const hadToken = Boolean(token);
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = `${API_BASE_URL}${path}`;
  console.log('[CrownBid Request]', url);

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (error) {
    console.warn('[CrownBid Request failed]', url, error);
    const networkError: ApiError = {
      message: 'No se pudo conectar con el servidor. Verificá tu conexión.',
      statusCode: 0,
    };
    throw networkError;
  }
  if (!response.ok) {
    const payload = await parseResponse<ApiError>(response);
    const error: ApiError = {
      message: payload?.message || response.statusText || 'Error en la solicitud.',
      statusCode: response.status,
      code: (payload as ApiError & { code?: string })?.code,
    };

    if (shouldTriggerSessionExpiration(path, hadToken, response.status, error.code)) {
      await triggerSessionExpired(clearAuthSession);
    }

    throw error;
  }
  return parseResponse<T>(response);
}

export async function registerUser(payload: {
  firstName: string;
  lastName: string;
  email: string;
  documentNumber: string;
  address: string;
  countryId: number;
  documentFrontImageBase64?: string | null;
  documentBackImageBase64?: string | null;
}): Promise<{ message: string; emailSentTo?: string }> {
  return request('/auth/register', {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await request<AuthResponse>('/auth/login', {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ email: normalizeEmail(email), password }),
  });

  if (response.accessToken) {
    setAuthToken(response.accessToken);
  }

  return response;
}

export async function changeInitialPassword(currentPassword: string, newPassword: string): Promise<AuthResponse> {
  const response = await request<AuthResponse>('/auth/change-initial-password', {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  if (response.accessToken) {
    setAuthToken(response.accessToken);
  }

  return response;
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  return request('/auth/forgot-password', {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token: string, password: string): Promise<AuthResponse> {
  const response = await request<AuthResponse>('/auth/reset-password', {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ token, password }),
  });

  if (response.accessToken) {
    setAuthToken(response.accessToken);
  }

  return response;
}

export async function getCurrentUser(): Promise<UserProfile> {
  return request('/users/me', {
    method: 'GET',
    headers: buildHeaders(),
  });
}

export async function updateProfile(fields: {
  address?: string | null;
  email?: string;
}): Promise<UserProfile> {
  return request('/users/me', {
    method: 'PATCH',
    headers: buildHeaders(),
    body: JSON.stringify(fields),
  });
}

export async function getMyMetrics(): Promise<UserMetrics> {
  return request('/users/me/metrics', {
    method: 'GET',
    headers: buildHeaders(),
  });
}

export async function logout(): Promise<void> {
  await request('/auth/logout', {
    method: 'POST',
    headers: buildHeaders(),
  });
  await setAuthTokenAsync(null);
}

export async function fetchRegisterCountries(): Promise<{ items: { id: number; name: string; shortName: string | null }[] }> {
  return request('/auth/register/countries', {
    method: 'GET',
    headers: buildHeaders(),
  });
}

export async function updatePaymentMethodGuarantee(
  id: number,
  montoGarantia: number
): Promise<{ item: PaymentMethod; message: string }> {
  return request(`/users/me/payment-methods/${id}/guarantee`, {
    method: 'PATCH',
    headers: buildHeaders(),
    body: JSON.stringify({ montoGarantia }),
  });
}

export async function fetchPaymentMethods(): Promise<{ items: PaymentMethod[] }> {
  return request('/users/me/payment-methods', {
    method: 'GET',
    headers: buildHeaders(),
  });
}

export async function disablePaymentMethod(id: number): Promise<{ id: number; status: string }> {
  return request(`/users/me/payment-methods/${id}/disable`, {
    method: 'PATCH',
    headers: buildHeaders(),
  });
}

export async function createPaymentMethod(payload: {
  tipo: string;
  moneda: string;
  titular: string;
  entidad: string;
  ultimosDigitos?: string | null;
  aliasOCbu?: string | null;
  montoGarantia?: number | null;
}): Promise<{ id: number; type: string; status: string; message: string }> {
  return request('/users/me/payment-methods', {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });
}

export async function registerAsistente(auctionId: number) {
  return request(`/subastas/${auctionId}/asistentes`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({}),
  });
}

export async function enterLiveSession(auctionId: number) {
  return request(`/subastas/${auctionId}/live/session`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({}),
  });
}

export async function leaveLiveSession(auctionId: number) {
  return request(`/subastas/${auctionId}/live/session`, {
    method: 'DELETE',
    headers: buildHeaders(),
  });
}

export async function placeBid(auctionId: number, body: {
  itemId: number;
  amount: number;
  paymentMethodId: number;
}) {
  return request(`/subastas/${auctionId}/pujos`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });
}

export async function fetchBidHistory(auctionId: number, itemId?: number) {
  const query = itemId ? `?itemId=${itemId}` : '';
  return request(`/subastas/${auctionId}/bids/history${query}`, {
    method: 'GET',
    headers: buildHeaders(),
  });
}

export async function fetchItem(itemId: number) {
  return request(`/items/${itemId}`, {
    method: 'GET',
    headers: buildHeaders(),
  });
}

export async function fetchAuctionDetail(id: number) {
  return request(`/subastas/${id}`, {
    method: 'GET',
    headers: buildHeaders(),
  });
}

export async function fetchAuctionItems(id: number) {
  return request(`/subastas/${id}/items`, {
    method: 'GET',
    headers: buildHeaders(),
  });
}

export async function fetchAuctions(params?: { featured?: boolean; status?: string; category?: string }) {
  const qs = new URLSearchParams();
  if (params?.featured !== undefined) qs.set('featured', String(params.featured));
  if (params?.status) qs.set('status', params.status);
  if (params?.category) qs.set('category', params.category);
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return request(`/subastas${query}`, {
    method: 'GET',
    headers: buildHeaders(),
  });
}

export async function fetchSellerPayoutAccount() {
  return request('/users/me/seller/payout-account', {
    method: 'GET',
    headers: buildHeaders(),
  });
}

export async function createSubmission(payload: {
  nombre: string;
  descripcion: string;
  historia?: string;
  artistaODisenador?: string;
  fechaOrigen?: string;
  componentes?: string;
  declaracionPropiedad: true;
  declaracionSinImpedimentos: true;
  origenLicitoDeclarado: true;
  declaracionDevolucionACargo: true;
  fotos: { filename: string; mimeType: string; base64: string }[];
}) {
  await initAuthToken();
  if (!getAuthToken()) {
    const authError: ApiError = {
      message: 'Sesión expirada. Volvé a iniciar sesión.',
      statusCode: 401,
      code: 'AUTH_REQUIRED',
    };
    throw authError;
  }

  console.log('[CrownBid createSubmission]', {
    nombre: payload.nombre,
    descripcionLength: payload.descripcion.length,
    fotos: payload.fotos.length,
  });

  return request('/items/submissions', {
    method: 'POST',
    headers: buildHeaders('application/json'),
    body: JSON.stringify(payload),
  });
}

export async function fetchMySubmissions() {
  return request('/items/my-submissions', {
    method: 'GET',
    headers: buildHeaders(),
  });
}

export async function cancelSubmission(id: number): Promise<void> {
  return request(`/users/me/item-submissions/${id}`, {
    method: 'DELETE',
    headers: buildHeaders(),
  });
}

export async function fetchNotifications(limit = 50, offset = 0): Promise<NotificationListResponse> {
  return request(`/users/me/notifications?limit=${limit}&offset=${offset}`, {
    method: 'GET',
    headers: buildHeaders(),
  });
}

export async function fetchUnreadNotificationCount(): Promise<{ unreadCount: number }> {
  return request('/users/me/notifications/unread-count', {
    method: 'GET',
    headers: buildHeaders(),
  });
}

export async function markNotificationRead(notificationId: number): Promise<Notification> {
  return request(`/users/me/notifications/${notificationId}/read`, {
    method: 'PATCH',
    headers: buildHeaders(),
  });
}

export async function markAllNotificationsRead(): Promise<{ updated: number }> {
  return request('/users/me/notifications/read-all', {
    method: 'PATCH',
    headers: buildHeaders(),
  });
}

export async function fetchLiveAuctionState(
  auctionId: number,
  watchedItemId?: number
): Promise<LiveAuctionState> {
  const query = watchedItemId != null ? `?watchedItemId=${watchedItemId}` : '';
  return request(`/subastas/${auctionId}/live${query}`, {
    method: 'GET',
    headers: buildHeaders(),
  });
}

export async function fetchItemResult(
  auctionId: number,
  itemId: number
): Promise<ItemFinalizationResult> {
  return request(`/subastas/${auctionId}/items/${itemId}/resultado`, {
    method: 'GET',
    headers: buildHeaders(),
  });
}

export async function fetchMyPurchases(): Promise<{ items: PurchaseItem[]; limitations?: string[] }> {
  return request('/users/me/purchases', {
    method: 'GET',
    headers: buildHeaders(),
  });
}
