import type { APIGatewayProxyHandler } from 'aws-lambda';
import { FriendRequestSchema } from '../../src/types';
import { parseBody } from '../../src/utils/validation';
import * as response from '../../src/utils/response';
import { authenticateRequest } from '../../src/middleware/auth';
import * as friendsService from '../../src/services/friends';

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
  const parsed = parseBody(event, FriendRequestSchema);
  if (!parsed.success) {
    return parsed.response;
  }

  try {
    const result = await friendsService.sendFriendRequest(user.userId, parsed.data.phoneNumber);
    
    if (!result.success) {
      return response.badRequest('Friend Request Failed', result.message);
    }

    return response.created(
      { friendship: result.friendship },
      result.message
    );
  } catch (error) {
    console.error('Error in friends/request:', error);
    return response.internalError('Failed to send friend request');
  }
};
