import type { APIGatewayProxyHandler } from 'aws-lambda';
import { EventResponseSchema } from '../../src/types';
import { parseBody, getPathParam } from '../../src/utils/validation';
import * as response from '../../src/utils/response';
import { authenticateRequest } from '../../src/middleware/auth';
import * as eventsService from '../../src/services/events';

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
  const eventId = getPathParam(event, 'eventId');

  if (!eventId) {
    return response.badRequest('Validation Error', 'eventId is required');
  }

  // Parse and validate request body
  const parsed = parseBody(event, EventResponseSchema);
  if (!parsed.success) {
    return parsed.response;
  }

  try {
    const result = await eventsService.respondToEvent(eventId, user.userId, parsed.data);
    
    if (!result.success) {
      return response.badRequest('Response Failed', result.message);
    }

    // Get updated event to return
    const updatedEvent = await eventsService.getEvent(eventId);
    
    // TODO: Send push notification to host about response

    return response.success(
      { event: updatedEvent },
      `Response recorded: ${parsed.data.status}`
    );
  } catch (error) {
    console.error('Error in events/respond:', error);
    return response.internalError('Failed to record response');
  }
};
