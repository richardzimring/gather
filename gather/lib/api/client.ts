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
