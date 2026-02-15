import * as WebBrowser from 'expo-web-browser'

import { getCalendarsGoogleAuthUrl } from '../api/client'

/**
 * Initiate the Google OAuth flow.
 *
 * 1. Fetches the Google OAuth consent URL from the backend
 * 2. Opens it in an in-app browser via expo-web-browser
 * 3. Google redirects to our backend (GOOGLE_REDIRECT_URI), which exchanges
 *    the code for tokens and stores them server-side
 * 4. The backend then redirects to gather://calendars/google/callback?success=true
 * 5. We detect that redirect here and return
 *
 * The authorization code never touches the client — it goes directly
 * from Google to the backend for maximum security.
 */
export async function connectGoogleCalendar(): Promise<void> {
  // 1. Get the OAuth URL from our backend
  const authUrlResponse = await getCalendarsGoogleAuthUrl()
  if (!authUrlResponse.data?.success || !authUrlResponse.data.data?.authUrl) {
    throw new Error('Failed to get Google OAuth URL')
  }

  const authUrl = authUrlResponse.data.data.authUrl

  // 2. Open in-app browser and wait for the backend to redirect back to the app
  const result = await WebBrowser.openAuthSessionAsync(
    authUrl,
    'gather://calendars/google/callback',
  )

  if (result.type !== 'success' || !result.url) {
    throw new GoogleAuthCancelledError()
  }

  // 3. Check if the backend reported success or an error
  const url = new URL(result.url)
  const success = url.searchParams.get('success')
  const error = url.searchParams.get('error')

  if (error || success !== 'true') {
    throw new Error(
      error
        ? `Google authorization failed: ${error}`
        : 'Google authorization did not complete successfully',
    )
  }

  // Token exchange and calendar import happened on the backend.
  // The caller should invalidate/refetch calendar queries.
}

/**
 * Error thrown when the user cancels the Google OAuth flow.
 * Can be caught separately to avoid showing an error message.
 */
export class GoogleAuthCancelledError extends Error {
  constructor() {
    super('Google authorization was cancelled')
    this.name = 'GoogleAuthCancelledError'
  }
}
