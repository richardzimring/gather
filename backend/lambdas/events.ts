import { createRoute, z } from '@hono/zod-openapi';
import { createApp, handle, authMiddleware } from '../src/middleware/hono';
import {
  EventSchema,
  CreateEventSchema,
  UpdateEventSchema,
  EventResponseSchema,
  ErrorResponseSchema,
} from '../src/types';
import * as eventsService from '../src/services/events';

const app = createApp();

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
    200: {
      content: {
        'application/json': {
          schema: EventsResponseSchema,
        },
      },
      description: 'Events retrieved successfully',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Unauthorized',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Internal server error',
    },
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
    body: {
      content: {
        'application/json': {
          schema: CreateEventSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: SingleEventResponseSchema,
        },
      },
      description: 'Event created successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Validation error',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Unauthorized',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Internal server error',
    },
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
        .string()
        .uuid()
        .openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: SingleEventResponseSchema,
        },
      },
      description: 'Event retrieved successfully',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Unauthorized',
    },
    403: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Forbidden',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Event not found',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Internal server error',
    },
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
        .string()
        .uuid()
        .openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
    }),
    body: {
      content: {
        'application/json': {
          schema: UpdateEventSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: SingleEventResponseSchema,
        },
      },
      description: 'Event updated successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Validation error or update failed',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Unauthorized',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Internal server error',
    },
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
        .string()
        .uuid()
        .openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({}),
            message: z.string().optional(),
          }),
        },
      },
      description: 'Event cancelled successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Cancel failed',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Unauthorized',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Internal server error',
    },
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
        .string()
        .uuid()
        .openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
    }),
    body: {
      content: {
        'application/json': {
          schema: EventResponseSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: SingleEventResponseSchema,
        },
      },
      description: 'Event response recorded successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Response failed',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Unauthorized',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Internal server error',
    },
  },
});

// ============================================
// Route Handlers
// ============================================

app.openapi(getEventsRoute, async (c) => {
  const user = c.get('user');

  try {
    const events = await eventsService.getEventsForUser(user.userId);
    return c.json(
      {
        success: true as const,
        data: { events },
      },
      200,
    );
  } catch (error) {
    console.error('Error in GET /events:', error);
    return c.json(
      {
        success: false as const,
        error: 'Internal Server Error',
        message: 'Failed to fetch events',
      },
      500,
    );
  }
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

  try {
    const event = await eventsService.createEvent(user.userId, data);

    return c.json(
      {
        success: true as const,
        data: { event },
        message: 'Event created successfully',
      },
      201,
    );
  } catch (error) {
    console.error('Error in POST /events:', error);
    return c.json(
      {
        success: false as const,
        error: 'Internal Server Error',
        message: 'Failed to create event',
      },
      500,
    );
  }
});

app.openapi(getEventRoute, async (c) => {
  const user = c.get('user');
  const { eventId } = c.req.valid('param');

  try {
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
  } catch (error) {
    console.error('Error in GET /events/:eventId:', error);
    return c.json(
      {
        success: false as const,
        error: 'Internal Server Error',
        message: 'Failed to fetch event',
      },
      500,
    );
  }
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

  try {
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
  } catch (error) {
    console.error('Error in PATCH /events/:eventId:', error);
    return c.json(
      {
        success: false as const,
        error: 'Internal Server Error',
        message: 'Failed to update event',
      },
      500,
    );
  }
});

app.openapi(deleteEventRoute, async (c) => {
  const user = c.get('user');
  const { eventId } = c.req.valid('param');

  try {
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
  } catch (error) {
    console.error('Error in DELETE /events/:eventId:', error);
    return c.json(
      {
        success: false as const,
        error: 'Internal Server Error',
        message: 'Failed to cancel event',
      },
      500,
    );
  }
});

app.openapi(respondToEventRoute, async (c) => {
  const user = c.get('user');
  const { eventId } = c.req.valid('param');
  const data = c.req.valid('json');

  try {
    const result = await eventsService.respondToEvent(
      eventId,
      user.userId,
      data,
    );

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
  } catch (error) {
    console.error('Error in POST /events/:eventId/respond:', error);
    return c.json(
      {
        success: false as const,
        error: 'Internal Server Error',
        message: 'Failed to record response',
      },
      500,
    );
  }
});

// Export the app for OpenAPI generation
export { app };
export const handler = handle(app);
