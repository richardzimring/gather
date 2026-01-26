// Auth service for Apple Sign In integration
// JWT verification is handled by Hono middleware using Apple JWKS

// Note: Most auth logic is now handled by:
// 1. Apple Sign In (user authentication, token issuance)
// 2. Hono JWT middleware (token verification via Apple JWKS)
// 3. User service (user record management)

// This file can be extended for additional auth-related business logic
// such as permission checks, role management, etc.

export const validateUserAccess = (
  userId: string,
  resourceOwnerId: string,
): boolean => {
  return userId === resourceOwnerId;
};
