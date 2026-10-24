import * as SecureStore from 'expo-secure-store';

import type { Tokens } from './types';

/**
 * Backend URL, from EXPO_PUBLIC_API_URL in .env.local (see .env.example).
 * Expo inlines it at bundle time, so restart `expo start` after changing it.
 */
export const API_URL = (() => {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!url) {
    throw new Error('EXPO_PUBLIC_API_URL is not set. Copy .env.example to .env.local and set it.');
  }
  return url.replace(/\/+$/, '');
})();

const REFRESH_TOKEN_KEY = 'foodscan.refreshToken';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** ok: new tokens saved; invalid: the session is over; offline: couldn't reach the server. */
export type RefreshResult = 'ok' | 'invalid' | 'offline';

let accessToken: string | null = null;
let refreshInFlight: Promise<RefreshResult> | null = null;
let onSessionExpired: () => void = () => {};

/** Called by AuthProvider so an unrecoverable 401 signs the user out. */
export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler;
}

export async function saveTokens(tokens: Tokens) {
  accessToken = tokens.accessToken;
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

export async function clearTokens() {
  accessToken = null;
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

export async function getStoredRefreshToken() {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export function getAccessToken() {
  return accessToken;
}

/**
 * Exchanges the stored refresh token for new tokens. Concurrent callers share
 * one request, because the server rotates refresh tokens and treats reuse of
 * an old one as theft.
 */
export function refreshSession(): Promise<RefreshResult> {
  refreshInFlight ??= (async (): Promise<RefreshResult> => {
    try {
      const refreshToken = await getStoredRefreshToken();
      if (!refreshToken) return 'invalid';
      const res = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (res.status === 401) {
        await clearTokens();
        return 'invalid';
      }
      if (!res.ok) return 'offline';
      await saveTokens((await res.json()) as Tokens);
      return 'ok';
    } catch {
      return 'offline';
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
};

export async function api<T>(path: string, { method = 'GET', body, auth = true }: RequestOptions = {}): Promise<T> {
  const send = () =>
    fetch(`${API_URL}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(auth && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  let res: Response;
  try {
    res = await send();
    if (res.status === 401 && auth) {
      const refreshed = await refreshSession();
      if (refreshed === 'ok') {
        res = await send();
      } else if (refreshed === 'invalid') {
        onSessionExpired();
      }
    }
  } catch {
    throw new ApiError(0, `Can't reach the server at ${API_URL}. Check your connection.`);
  }

  if (!res.ok) {
    throw new ApiError(res.status, await errorMessage(res));
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

/** Spring returns RFC 9457 problem details; "detail" holds the human-readable reason. */
async function errorMessage(res: Response) {
  try {
    const problem = await res.json();
    if (typeof problem?.detail === 'string' && problem.detail) return problem.detail;
  } catch {
    // not JSON
  }
  return res.status === 401 ? 'Please sign in again.' : `Request failed (${res.status})`;
}
