import type { APIGatewayProxyHandler } from 'aws-lambda';
import { VerifyCodeSchema } from '../../src/types';
import type { AuthResponse } from '../../src/types';
import { parseBody } from '../../src/utils/validation';
import * as response from '../../src/utils/response';
import * as authService from '../../src/services/auth';
import * as userService from '../../src/services/users';
import { generateTokens } from '../../src/utils/jwt';

export const handler: APIGatewayProxyHandler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return response.options();
  }

  // Parse and validate request body
  const parsed = parseBody(event, VerifyCodeSchema);
  if (!parsed.success) {
    return parsed.response;
  }

  const { phoneNumber, code } = parsed.data;

  try {
    // Verify the code
    const verifyResult = await authService.verifyCode(phoneNumber, code);
    if (!verifyResult.success) {
      return response.badRequest('Verification Failed', verifyResult.message);
    }

    // Check if user exists
    let user = await userService.getUserByPhone(phoneNumber);
    let isNewUser = false;

    if (!user) {
      // Create new user with placeholder display name
      // The client will prompt them to set their name
      user = await userService.createUser({
        phoneNumber,
        displayName: 'New User',
      });
      isNewUser = true;
    }

    // Generate JWT tokens
    const tokens = generateTokens(user.userId);

    const authResponse: AuthResponse = {
      user,
      tokens,
      isNewUser,
    };

    return response.success(authResponse, 'Authentication successful');
  } catch (error) {
    console.error('Error in verify-code:', error);
    return response.internalError('Authentication failed');
  }
};
