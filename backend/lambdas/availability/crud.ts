import type { APIGatewayProxyHandler } from 'aws-lambda';
import { CreateAvailabilitySchema, UpdateAvailabilitySchema } from '../../src/types';
import { parseBody, getPathParam } from '../../src/utils/validation';
import * as response from '../../src/utils/response';
import { authenticateRequest } from '../../src/middleware/auth';
import * as availabilityService from '../../src/services/availability';

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
        const windows = await availabilityService.getAvailabilityWindows(user.userId);
        return response.success({ windows });
      }

      case 'POST': {
        const parsed = parseBody(event, CreateAvailabilitySchema);
        if (!parsed.success) {
          return parsed.response;
        }

        // Validate that end time is after start time
        if (parsed.data.endTime <= parsed.data.startTime) {
          return response.badRequest('Validation Error', 'End time must be after start time');
        }

        const window = await availabilityService.createAvailabilityWindow(user.userId, parsed.data);
        return response.created({ window }, 'Availability window created successfully');
      }

      case 'PATCH': {
        const windowId = getPathParam(event, 'windowId');
        if (!windowId) {
          return response.badRequest('Validation Error', 'windowId is required');
        }

        const parsed = parseBody(event, UpdateAvailabilitySchema);
        if (!parsed.success) {
          return parsed.response;
        }

        // Validate times if both are provided
        if (parsed.data.startTime && parsed.data.endTime) {
          if (parsed.data.endTime <= parsed.data.startTime) {
            return response.badRequest('Validation Error', 'End time must be after start time');
          }
        }

        const result = await availabilityService.updateAvailabilityWindow(
          user.userId,
          windowId,
          parsed.data
        );
        if (!result.success) {
          return response.badRequest('Update Failed', result.message);
        }

        return response.success({ window: result.window }, 'Availability window updated successfully');
      }

      case 'DELETE': {
        const windowId = getPathParam(event, 'windowId');
        if (!windowId) {
          return response.badRequest('Validation Error', 'windowId is required');
        }

        const result = await availabilityService.deleteAvailabilityWindow(user.userId, windowId);
        if (!result.success) {
          return response.badRequest('Delete Failed', result.message);
        }

        return response.noContent();
      }

      default:
        return response.badRequest('Method Not Allowed', `${event.httpMethod} not supported`);
    }
  } catch (error) {
    console.error('Error in availability/crud:', error);
    return response.internalError('Failed to process request');
  }
};
