import type { APIGatewayProxyHandler } from 'aws-lambda';
import { RefreshTokenSchema } from '../../src/types';
import { parseBody } from '../../src/utils/validation';
import * as response from '../../src/utils/response';
import * as userService from '../../src/services/users';
import { verifyToken, generateTokens } from '../../src/utils/jwt';

export const handler: APIGatewayProxyHandler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return response.options();
  }

  // Parse and validate request body
  const parsed = parseBody(event, RefreshTokenSchema);
  if (!parsed.success) {
    return parsed.response;
  }

  const { refreshToken } = parsed.data;

  try {
    // Verify the refresh token
    const payload = verifyToken(refreshToken, 'refresh');
    if (!payload) {
      return response.unauthorized('Invalid or expired refresh token');
    }

    // Verify user still exists
    const user = await userService.getUserById(payload.userId);
    if (!user) {
      return response.unauthorized('User not found');
    }

    // Generate new tokens
    const tokens = generateTokens(user.userId);

    return response.success({ tokens }, 'Tokens refreshed successfully');
  } catch (error) {
    console.error('Error in refresh:', error);
    return response.internalError('Failed to refresh tokens');
  }
};
