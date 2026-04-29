import axios from 'axios';
import { normalizeUserMessage } from '@/lib/platform-errors';

const ACCESS_TOKEN_KEY = 'accessToken';
const CURRENT_USER_KEY = 'currentUser';
const SESSION_ACCESS_TOKEN_KEY = 'sessionAccessToken';
const SESSION_CURRENT_USER_KEY = 'sessionCurrentUser';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

export function getStoredAccessToken() {
  if (typeof window === 'undefined') {
    return null;
  }

  return (
    window.localStorage.getItem(ACCESS_TOKEN_KEY) ??
    window.sessionStorage.getItem(SESSION_ACCESS_TOKEN_KEY)
  );
}

export function getStoredCurrentUser() {
  if (typeof window === 'undefined') {
    return null;
  }

  return (
    window.localStorage.getItem(CURRENT_USER_KEY) ??
    window.sessionStorage.getItem(SESSION_CURRENT_USER_KEY)
  );
}

export function persistSession(token: string, user?: unknown, remember = true) {
  if (typeof window === 'undefined') {
    return;
  }

  clearPersistedSession();

  const storage = remember ? window.localStorage : window.sessionStorage;
  const tokenKey = remember ? ACCESS_TOKEN_KEY : SESSION_ACCESS_TOKEN_KEY;
  const userKey = remember ? CURRENT_USER_KEY : SESSION_CURRENT_USER_KEY;

  storage.setItem(tokenKey, token);

  if (user) {
    storage.setItem(userKey, JSON.stringify(user));
  }
}

export function clearPersistedSession() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(CURRENT_USER_KEY);
  window.sessionStorage.removeItem(SESSION_ACCESS_TOKEN_KEY);
  window.sessionStorage.removeItem(SESSION_CURRENT_USER_KEY);
}

apiClient.interceptors.request.use((config) => {
  const token = getStoredAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (!config.headers['Content-Type'] && config.method !== 'get') {
    config.headers['Content-Type'] = 'application/json';
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      clearPersistedSession();
    }

    const rawMessage = error?.response?.data?.message ?? '请求失败，请稍后重试。';
    const messageText = Array.isArray(rawMessage) ? rawMessage.join('；') : String(rawMessage);
    const message = normalizeUserMessage(messageText);
    return Promise.reject(new Error(message));
  },
);
