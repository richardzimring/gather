import { client } from './generated/client.gen'
import { API_BASE_URL } from '../config'

// Re-export everything from generated files
export * from './generated/types.gen'
export * from './generated/sdk.gen'
export { client }

// Configure the client with base URL from environment variables
client.setConfig({
  baseUrl: API_BASE_URL,
})

/**
 * Set the authorization token for API requests
 */
export function setAuthToken(token: string | null) {
  if (token) {
    client.setConfig({
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  } else {
    client.setConfig({
      headers: {
        Authorization: undefined,
      },
    })
  }
}

/**
 * Get the current base URL
 */
export function getBaseUrl() {
  return API_BASE_URL
}

let interceptorId: number | null = null

/**
 * Register a response interceptor that calls onUnauthorized whenever the API
 * returns a 401. Safe to call multiple times — previous interceptor is ejected
 * first. Pass null to remove the interceptor (e.g. on sign-out).
 */
export function setup401Interceptor(onUnauthorized: (() => void) | null) {
  if (interceptorId !== null) {
    client.interceptors.response.eject(interceptorId)
    interceptorId = null
  }

  if (onUnauthorized) {
    interceptorId = client.interceptors.response.use((response) => {
      if (response.status === 401) {
        onUnauthorized()
      }
      return response
    })
  }
}
