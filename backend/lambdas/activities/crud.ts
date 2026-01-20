import type { APIGatewayProxyHandler } from 'aws-lambda';
import { CreateActivitySchema, UpdateActivitySchema } from '../../src/types';
import { parseBody, getPathParam } from '../../src/utils/validation';
import * as response from '../../src/utils/response';
import { authenticateRequest } from '../../src/middleware/auth';
import * as activitiesService from '../../src/services/activities';

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
        const activities = await activitiesService.getActivities(user.userId);
        return response.success({ activities });
      }

      case 'POST': {
        const parsed = parseBody(event, CreateActivitySchema);
        if (!parsed.success) {
          return parsed.response;
        }

        const activity = await activitiesService.createActivity(user.userId, parsed.data);
        return response.created({ activity }, 'Activity created successfully');
      }

      case 'PATCH': {
        const activityId = getPathParam(event, 'activityId');
        if (!activityId) {
          return response.badRequest('Validation Error', 'activityId is required');
        }

        const parsed = parseBody(event, UpdateActivitySchema);
        if (!parsed.success) {
          return parsed.response;
        }

        const result = await activitiesService.updateActivity(activityId, user.userId, parsed.data);
        if (!result.success) {
          return response.badRequest('Update Failed', result.message);
        }

        return response.success({ activity: result.activity }, 'Activity updated successfully');
      }

      case 'DELETE': {
        const activityId = getPathParam(event, 'activityId');
        if (!activityId) {
          return response.badRequest('Validation Error', 'activityId is required');
        }

        const result = await activitiesService.deleteActivity(activityId, user.userId);
        if (!result.success) {
          return response.badRequest('Delete Failed', result.message);
        }

        return response.noContent();
      }

      default:
        return response.badRequest('Method Not Allowed', `${event.httpMethod} not supported`);
    }
  } catch (error) {
    console.error('Error in activities/crud:', error);
    return response.internalError('Failed to process request');
  }
};
