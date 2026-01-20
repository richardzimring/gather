import type { APIGatewayProxyHandler } from 'aws-lambda';
import { RegisterPushTokenSchema } from '../../src/types';
import { parseBody } from '../../src/utils/validation';
import * as response from '../../src/utils/response';
import { authenticateRequest } from '../../src/middleware/auth';
import * as userService from '../../src/services/users';

export const handler: APIGatewayProxyHandler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return response.options();
  }

  // Authenticate
  const authResult = await authenticateRequest(event);
  if (!authResult.success) {
    return response.unauthorized(authResult.message);
  }

  const { user } = authResult;

  // Parse and validate request body
  const parsed = parseBody(event, RegisterPushTokenSchema);
  if (!parsed.success) {
    return parsed.response;
  }

  try {
    await userService.updatePushToken(user.userId, parsed.data.pushToken);
    return response.success({ registered: true }, 'Push token registered successfully');
  } catch (error) {
    console.error('Error in users/push-token:', error);
    return response.internalError('Failed to register push token');
  }
};
