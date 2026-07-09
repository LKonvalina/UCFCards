import { API_URL } from './config';

type RequestOptions = {
  method?: string;
  body?: unknown;
};

type TokenProvider = () => Promise<string | null>;

let tokenProvider: TokenProvider | null = null;

export function setAuthTokenProvider(provider: TokenProvider | null) {
  tokenProvider = provider;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = tokenProvider ? await tokenProvider() : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = await response.json().catch(() => ({ message: response.statusText }));

  if (!response.ok) {
    throw new Error(typeof payload.message === 'string' ? payload.message : 'Request failed.');
  }

  return payload as T;
}
