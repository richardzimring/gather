import type { APIGatewayProxyHandler } from 'aws-lambda';
import { CreateGroupSchema, UpdateGroupSchema } from '../../src/types';
import { parseBody, getPathParam } from '../../src/utils/validation';
import * as response from '../../src/utils/response';
import { authenticateRequest } from '../../src/middleware/auth';
import * as groupsService from '../../src/services/groups';

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
        const groups = await groupsService.getGroups(user.userId);
        return response.success({ groups });
      }

      case 'POST': {
        const parsed = parseBody(event, CreateGroupSchema);
        if (!parsed.success) {
          return parsed.response;
        }

        const group = await groupsService.createGroup(user.userId, parsed.data);
        return response.created({ group }, 'Group created successfully');
      }

      case 'PATCH': {
        const groupId = getPathParam(event, 'groupId');
        if (!groupId) {
          return response.badRequest('Validation Error', 'groupId is required');
        }

        const parsed = parseBody(event, UpdateGroupSchema);
        if (!parsed.success) {
          return parsed.response;
        }

        const result = await groupsService.updateGroup(groupId, user.userId, parsed.data);
        if (!result.success) {
          return response.badRequest('Update Failed', result.message);
        }

        return response.success({ group: result.group }, 'Group updated successfully');
      }

      case 'DELETE': {
        const groupId = getPathParam(event, 'groupId');
        if (!groupId) {
          return response.badRequest('Validation Error', 'groupId is required');
        }

        const result = await groupsService.deleteGroup(groupId, user.userId);
        if (!result.success) {
          return response.badRequest('Delete Failed', result.message);
        }

        return response.noContent();
      }

      default:
        return response.badRequest('Method Not Allowed', `${event.httpMethod} not supported`);
    }
  } catch (error) {
    console.error('Error in groups/crud:', error);
    return response.internalError('Failed to process request');
  }
};
