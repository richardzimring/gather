import type { APIGatewayProxyHandler } from 'aws-lambda';
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

  try {
    const friendships = await friendsService.getFriendships(user.userId);
    
    // Separate into categories
    const friends = friendships.filter(f => f.status === 'accepted');
    const pendingReceived = friendships.filter(
      f => f.status === 'pending' && f.initiatedBy !== user.userId
    );
    const pendingSent = friendships.filter(
      f => f.status === 'pending' && f.initiatedBy === user.userId
    );

    return response.success({
      friends,
      pendingReceived,
      pendingSent,
    });
  } catch (error) {
    console.error('Error in friends/list:', error);
    return response.internalError('Failed to fetch friends');
  }
};
