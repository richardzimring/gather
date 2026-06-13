import { client } from './generated/client.gen';
import { API_BASE_URL } from '../config';

// Re-export everything from generated files
export * from './generated/types.gen';
export * from './generated/sdk.gen';
export { client };

/**
 * Thrown for non-2xx API responses (the generated client is configured with
 * throwOnError). Carries the backend's error envelope so UI code can show
 * server-provided messages.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly error?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let authToken: string | null = null;

/**
 * Set the authorization token attached to authenticated API requests.
 */
export function setAuthToken(token: string | null) {
  authToken = token;
}

client.setConfig({
  baseUrl: API_BASE_URL,
  // Generated SDK calls declare their bearer security; the client calls this
  // to resolve the token per request.
  auth: () => authToken ?? undefined,
});

// Normalize thrown non-2xx payloads (the backend's error envelope) into real
// Error instances so `err instanceof Error` and `err.message` work everywhere.
client.interceptors.error.use((error, response) => {
  if (error instanceof Error) return error;
  const status = response?.status ?? 0;
  if (error && typeof error === 'object') {
    const envelope = error as { error?: string; message?: string };
    return new ApiError(
      envelope.message ?? envelope.error ?? `Request failed (${status})`,
      status,
      envelope.error,
    );
  }
  return new ApiError(String(error), status);
});

let interceptorId: number | null = null;

/**
 * Register a response interceptor that calls onUnauthorized whenever the API
 * returns a 401. Safe to call multiple times — previous interceptor is ejected
 * first. Pass null to remove the interceptor (e.g. on sign-out).
 */
export function setup401Interceptor(onUnauthorized: (() => void) | null) {
  if (interceptorId !== null) {
    client.interceptors.response.eject(interceptorId);
    interceptorId = null;
  }

  if (onUnauthorized) {
    interceptorId = client.interceptors.response.use((response) => {
      if (response.status === 401) {
        onUnauthorized();
      }
      return response;
    });
  }
}
