// Auth service for Cognito integration
// JWT verification is handled by Hono middleware using Cognito JWKS

// Note: Most auth logic is now handled by:
// 1. Cognito User Pool (user authentication, token issuance)
// 2. Hono JWT middleware (token verification)
// 3. User service (user record management)

// This file can be extended for additional auth-related business logic
// such as permission checks, role management, etc.

export const validateUserAccess = (
  userId: string,
  resourceOwnerId: string,
): boolean => {
  return userId === resourceOwnerId;
};
