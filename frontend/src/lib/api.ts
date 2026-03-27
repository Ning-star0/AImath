import axios from 'axios';

const ACCESS_TOKEN_KEY = 'accessToken';
const CURRENT_USER_KEY = 'currentUser';
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

export function getStoredAccessToken() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function persistSession(token: string, user?: unknown) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(ACCESS_TOKEN_KEY, token);

  if (user) {
    window.localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  }
}

export function clearPersistedSession() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(CURRENT_USER_KEY);
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

    const message =
      error?.response?.data?.message ?? '请求失败，请稍后重试。';
    return Promise.reject(new Error(message));
  },
);
