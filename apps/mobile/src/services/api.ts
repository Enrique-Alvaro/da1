import Constants from 'expo-constants';
import { ApiError, AuthResponse, UserProfile } from './types';

const API_BASE_URL = (() => {
  const url = Constants.expoConfig?.extra?.apiBaseUrl;
  return typeof url === 'string' && url.trim() ? url : 'http://localhost:3000/api';
})();

let authToken: string | null = null;

function persistToken(token: string | null) {
  authToken = token;

  if (typeof window !== 'undefined' && window.localStorage) {
    if (token) {
      window.localStorage.setItem('crownbid_token', token);
    } else {
      window.localStorage.removeItem('crownbid_token');
    }
  }
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
  persistToken(token);
}

function buildHeaders(contentType = 'application/json') {
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
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  if (!response.ok) {
    const payload = await parseResponse<ApiError>(response);
    const error: ApiError = {
      message: payload?.message || response.statusText,
      statusCode: response.status,
    };
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
  documentFrontImageBase64: string;
  documentBackImageBase64: string;
  photoBase64?: string | null;
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
    body: JSON.stringify({ email, password }),
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

export async function logout(): Promise<void> {
  await request('/auth/logout', {
    method: 'POST',
    headers: buildHeaders(),
  });
  setAuthToken(null);
}

export async function fetchPaymentMethods() {
  return request('/users/me/payment-methods', {
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
