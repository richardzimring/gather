import { createRoute, z } from '@hono/zod-openapi';
import { createApp, authMiddleware } from '../middleware/hono';
import {
  EventSchema,
  CreateEventSchema,
  UpdateEventSchema,
  EventResponseSchema,
  jsonContent,
  errorResponses,
  jsonBody,
} from '../types';
import * as eventsService from '../services/events';

export const app = createApp();

// All routes require authentication
app.use('*', authMiddleware);

// ============================================
// Response Schemas
// ============================================

const EventsResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      events: z.array(EventSchema),
    }),
  })
  .openapi('EventsResponse');

const SingleEventResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      event: EventSchema,
    }),
    message: z.string().optional(),
  })
  .openapi('SingleEventResponse');

// ============================================
// Route Definitions
// ============================================

const getEventsRoute = createRoute({
  method: 'get',
  path: '/events',
  tags: ['Events'],
  summary: 'Get events',
  description: 'Get events for the current user',
  security: [{ BearerAuth: [] }],
  responses: {
    200: jsonContent(EventsResponseSchema, 'Events retrieved successfully'),
    ...errorResponses(401, 500),
  },
});

const createEventRoute = createRoute({
  method: 'post',
  path: '/events',
  tags: ['Events'],
  summary: 'Create event',
  description: 'Create a new event',
  security: [{ BearerAuth: [] }],
  request: {
    body: jsonBody(CreateEventSchema),
  },
  responses: {
    201: jsonContent(SingleEventResponseSchema, 'Event created successfully'),
    ...errorResponses(400, 401, 500),
  },
});

const getEventRoute = createRoute({
  method: 'get',
  path: '/events/{eventId}',
  tags: ['Events'],
  summary: 'Get event',
  description: 'Get a specific event by ID',
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({
      eventId: z
        .uuid()
        .openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
    }),
  },
  responses: {
    200: jsonContent(SingleEventResponseSchema, 'Event retrieved successfully'),
    ...errorResponses(401, 403, 404, 500),
  },
});

const updateEventRoute = createRoute({
  method: 'patch',
  path: '/events/{eventId}',
  tags: ['Events'],
  summary: 'Update event',
  description: 'Update an existing event',
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({
      eventId: z
        .uuid()
        .openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
    }),
    body: jsonBody(UpdateEventSchema),
  },
  responses: {
    200: jsonContent(SingleEventResponseSchema, 'Event updated successfully'),
    ...errorResponses(400, 401, 500),
  },
});

const deleteEventRoute = createRoute({
  method: 'delete',
  path: '/events/{eventId}',
  tags: ['Events'],
  summary: 'Delete event',
  description: 'Delete an existing event',
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({
      eventId: z
        .uuid()
        .openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
    }),
  },
  responses: {
    200: jsonContent(
      z.object({
        success: z.literal(true),
        data: z.object({}),
        message: z.string().optional(),
      }),
      'Event cancelled successfully',
    ),
    ...errorResponses(400, 401, 500),
  },
});

const respondToEventRoute = createRoute({
  method: 'post',
  path: '/events/{eventId}/respond',
  tags: ['Events'],
  summary: 'Respond to event',
  description: 'Respond to an event invitation',
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({
      eventId: z
        .uuid()
        .openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
    }),
    body: jsonBody(EventResponseSchema),
  },
  responses: {
    200: jsonContent(
      SingleEventResponseSchema,
      'Event response recorded successfully',
    ),
    ...errorResponses(400, 401, 500),
  },
});

// ============================================
// Route Handlers
// ============================================

app.openapi(getEventsRoute, async (c) => {
  const user = c.get('user');

  const events = await eventsService.getEventsForUser(user.userId);
  return c.json(
    {
      success: true as const,
      data: { events },
    },
    200,
  );
});

app.openapi(createEventRoute, async (c) => {
  const user = c.get('user');
  const data = c.req.valid('json');

  // Validate times
  if (data.endTime <= data.startTime) {
    return c.json(
      {
        success: false as const,
        error: 'Validation Error',
        message: 'End time must be after start time',
      },
      400,
    );
  }

  if (data.inviteeIds.length === 0) {
    return c.json(
      {
        success: false as const,
        error: 'Validation Error',
        message: 'At least one invitee is required',
      },
      400,
    );
  }

  // Ensure user doesn't invite themselves
  if (data.inviteeIds.includes(user.userId)) {
    return c.json(
      {
        success: false as const,
        error: 'Validation Error',
        message: 'Cannot invite yourself to an event',
      },
      400,
    );
  }

  const event = await eventsService.createEvent(user.userId, data);

  return c.json(
    {
      success: true as const,
      data: { event },
      message: 'Event created successfully',
    },
    201,
  );
});

app.openapi(getEventRoute, async (c) => {
  const user = c.get('user');
  const { eventId } = c.req.valid('param');

  const eventData = await eventsService.getEvent(eventId);
  if (!eventData) {
    return c.json(
      {
        success: false as const,
        error: 'Not Found',
        message: 'Event not found',
      },
      404,
    );
  }

  // Check if user is host or invitee
  const isHost = eventData.hostId === user.userId;
  const isInvitee = eventData.invitees.some((i) => i.userId === user.userId);

  if (!isHost && !isInvitee) {
    return c.json(
      {
        success: false as const,
        error: 'Forbidden',
        message: 'Not authorized to view this event',
      },
      403,
    );
  }

  // If not showing invite list and user is invitee (not host), filter invitees
  if (!eventData.showInviteList && !isHost) {
    eventData.invitees = eventData.invitees.filter(
      (i) => i.userId === user.userId,
    );
  }

  return c.json(
    {
      success: true as const,
      data: { event: eventData },
    },
    200,
  );
});

app.openapi(updateEventRoute, async (c) => {
  const user = c.get('user');
  const { eventId } = c.req.valid('param');
  const data = c.req.valid('json');

  // Validate times if both provided
  if (data.startTime && data.endTime) {
    if (data.endTime <= data.startTime) {
      return c.json(
        {
          success: false as const,
          error: 'Validation Error',
          message: 'End time must be after start time',
        },
        400,
      );
    }
  }

  // Validate addInviteeIds if provided
  if (data.addInviteeIds && data.addInviteeIds.length > 0) {
    if (data.addInviteeIds.includes(user.userId)) {
      return c.json(
        {
          success: false as const,
          error: 'Validation Error',
          message: 'Cannot invite yourself to an event',
        },
        400,
      );
    }
  }

  const result = await eventsService.updateEvent(eventId, user.userId, data);
  if (!result.success || !result.event) {
    return c.json(
      {
        success: false as const,
        error: 'Update Failed',
        message: result.message ?? 'Failed to update event',
      },
      400,
    );
  }

  return c.json(
    {
      success: true as const,
      data: { event: result.event },
      message: 'Event updated successfully',
    },
    200,
  );
});

app.openapi(deleteEventRoute, async (c) => {
  const user = c.get('user');
  const { eventId } = c.req.valid('param');

  const result = await eventsService.cancelEvent(eventId, user.userId);
  if (!result.success) {
    return c.json(
      {
        success: false as const,
        error: 'Cancel Failed',
        message: result.message ?? 'Failed to cancel event',
      },
      400,
    );
  }

  return c.json(
    {
      success: true as const,
      data: {},
      message: 'Event cancelled successfully',
    },
    200,
  );
});

app.openapi(respondToEventRoute, async (c) => {
  const user = c.get('user');
  const { eventId } = c.req.valid('param');
  const data = c.req.valid('json');

  const result = await eventsService.respondToEvent(eventId, user.userId, data);

  if (!result.success) {
    return c.json(
      {
        success: false as const,
        error: 'Response Failed',
        message: result.message ?? 'Failed to respond to event',
      },
      400,
    );
  }

  // Get updated event to return
  const updatedEvent = await eventsService.getEvent(eventId);

  if (!updatedEvent) {
    return c.json(
      {
        success: false as const,
        error: 'Not Found',
        message: 'Event not found after response',
      },
      400,
    );
  }

  return c.json(
    {
      success: true as const,
      data: { event: updatedEvent },
      message: `Response recorded: ${data.status}`,
    },
    200,
  );
});
