import type { APIGatewayProxyHandler } from 'aws-lambda';
import { CreateEventSchema, UpdateEventSchema } from '../../src/types';
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

  try {
    switch (event.httpMethod) {
      case 'GET': {
        if (eventId) {
          // Get single event
          const eventData = await eventsService.getEvent(eventId);
          if (!eventData) {
            return response.notFound('Event not found');
          }

          // Check if user is host or invitee
          const isHost = eventData.hostId === user.userId;
          const isInvitee = eventData.invitees.some(i => i.userId === user.userId);
          
          if (!isHost && !isInvitee) {
            return response.forbidden('Not authorized to view this event');
          }

          // If not showing invite list and user is invitee (not host), filter invitees
          if (!eventData.showInviteList && !isHost) {
            eventData.invitees = eventData.invitees.filter(i => i.userId === user.userId);
          }

          return response.success({ event: eventData });
        } else {
          // Get all events for user
          const events = await eventsService.getEventsForUser(user.userId);
          return response.success({ events });
        }
      }

      case 'POST': {
        const parsed = parseBody(event, CreateEventSchema);
        if (!parsed.success) {
          return parsed.response;
        }

        // Validate times
        if (parsed.data.endTime <= parsed.data.startTime) {
          return response.badRequest('Validation Error', 'End time must be after start time');
        }

        if (parsed.data.inviteeIds.length === 0) {
          return response.badRequest('Validation Error', 'At least one invitee is required');
        }

        // Ensure user doesn't invite themselves
        if (parsed.data.inviteeIds.includes(user.userId)) {
          return response.badRequest('Validation Error', 'Cannot invite yourself to an event');
        }

        const eventData = await eventsService.createEvent(user.userId, parsed.data);
        
        // TODO: Send push notifications to invitees
        
        return response.created({ event: eventData }, 'Event created successfully');
      }

      case 'PATCH': {
        if (!eventId) {
          return response.badRequest('Validation Error', 'eventId is required');
        }

        const parsed = parseBody(event, UpdateEventSchema);
        if (!parsed.success) {
          return parsed.response;
        }

        // Validate times if both provided
        if (parsed.data.startTime && parsed.data.endTime) {
          if (parsed.data.endTime <= parsed.data.startTime) {
            return response.badRequest('Validation Error', 'End time must be after start time');
          }
        }

        const result = await eventsService.updateEvent(eventId, user.userId, parsed.data);
        if (!result.success) {
          return response.badRequest('Update Failed', result.message);
        }

        return response.success({ event: result.event }, 'Event updated successfully');
      }

      case 'DELETE': {
        if (!eventId) {
          return response.badRequest('Validation Error', 'eventId is required');
        }

        const result = await eventsService.cancelEvent(eventId, user.userId);
        if (!result.success) {
          return response.badRequest('Cancel Failed', result.message);
        }

        return response.success({}, 'Event cancelled successfully');
      }

      default:
        return response.badRequest('Method Not Allowed', `${event.httpMethod} not supported`);
    }
  } catch (error) {
    console.error('Error in events/crud:', error);
    return response.internalError('Failed to process request');
  }
};
