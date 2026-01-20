import type { APIGatewayProxyHandler } from 'aws-lambda';
import { z } from 'zod';
import { parseQueryParams } from '../../src/utils/validation';
import * as response from '../../src/utils/response';
import { authenticateRequest } from '../../src/middleware/auth';
import * as availabilityService from '../../src/services/availability';

const QuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

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

  // Parse query parameters
  const parsed = parseQueryParams(event, QuerySchema);
  if (!parsed.success) {
    return parsed.response;
  }

  try {
    const availability = await availabilityService.getFriendsAvailability(
      user.userId,
      parsed.data.startDate,
      parsed.data.endDate
    );

    return response.success({ availability });
  } catch (error) {
    console.error('Error in availability/friends:', error);
    return response.internalError('Failed to fetch friends availability');
  }
};
