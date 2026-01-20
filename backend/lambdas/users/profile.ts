import type { APIGatewayProxyHandler } from 'aws-lambda';
import { UpdateUserSchema } from '../../src/types';
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

  try {
    switch (event.httpMethod) {
      case 'GET': {
        return response.success(user);
      }

      case 'PATCH': {
        const parsed = parseBody(event, UpdateUserSchema);
        if (!parsed.success) {
          return parsed.response;
        }

        const updatedUser = await userService.updateUser(user.userId, parsed.data);
        if (!updatedUser) {
          return response.notFound('User not found');
        }

        return response.success(updatedUser, 'Profile updated successfully');
      }

      case 'DELETE': {
        await userService.deleteUser(user.userId);
        return response.noContent();
      }

      default:
        return response.badRequest('Method Not Allowed', `${event.httpMethod} not supported`);
    }
  } catch (error) {
    console.error('Error in users/profile:', error);
    return response.internalError('Failed to process request');
  }
};
