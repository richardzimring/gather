/**
 * Thrown when the backend returns 403 indicating that the user's OAuth access
 * for a calendar provider has been revoked. The stale connections are already
 * deleted server-side; the user needs to reconnect via the OAuth flow.
 */
export class OAuthRevokedError extends Error {
  constructor() {
    super('OAUTH_REVOKED');
    this.name = 'OAuthRevokedError';
  }
}
