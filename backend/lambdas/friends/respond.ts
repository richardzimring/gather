import type { APIGatewayProxyHandler } from 'aws-lambda';
import * as response from '../../src/utils/response';
import { authenticateRequest } from '../../src/middleware/auth';
import { getPathParam } from '../../src/utils/validation';
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
  const friendId = getPathParam(event, 'friendId');

  if (!friendId) {
    return response.badRequest('Validation Error', 'friendId is required');
  }

  try {
    const path = event.path;
    
    if (path.endsWith('/accept')) {
      const result = await friendsService.acceptFriendRequest(user.userId, friendId);
      if (!result.success) {
        return response.badRequest('Accept Failed', result.message);
      }
      return response.success({ friendship: result.friendship }, result.message);
    }
    
    if (path.endsWith('/decline')) {
      const result = await friendsService.declineFriendRequest(user.userId, friendId);
      if (!result.success) {
        return response.badRequest('Decline Failed', result.message);
      }
      return response.success({}, result.message);
    }
    
    if (path.endsWith('/block')) {
      const result = await friendsService.blockUser(user.userId, friendId);
      if (!result.success) {
        return response.badRequest('Block Failed', result.message);
      }
      return response.success({}, result.message);
    }
    
    if (event.httpMethod === 'DELETE') {
      const result = await friendsService.removeFriend(user.userId, friendId);
      if (!result.success) {
        return response.badRequest('Remove Failed', result.message);
      }
      return response.noContent();
    }

    return response.badRequest('Invalid Operation', 'Unknown operation');
  } catch (error) {
    console.error('Error in friends/respond:', error);
    return response.internalError('Failed to process request');
  }
};
