import { z } from '@hono/zod-openapi';

// ============================================
// Zod Schemas for Validation + OpenAPI
// ============================================

// Example UUIDs for OpenAPI docs
const EXAMPLE_UUID = '550e8400-e29b-41d4-a716-446655440000';
const EXAMPLE_UUID_2 = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
const EXAMPLE_DATETIME = '2024-01-15T10:30:00.000Z';

// User schemas
export const UserSchema = z
  .object({
    userId: z.string().uuid().openapi({ example: EXAMPLE_UUID }),
    appleUserId: z
      .string()
      .min(1)
      .openapi({ example: '001234.abcdef1234567890.1234' }),
    email: z.string().email().openapi({ example: 'john@example.com' }),
    firstName: z.string().min(1).max(50).openapi({ example: 'John' }),
    lastName: z.string().min(1).max(50).openapi({ example: 'Doe' }),
    fullName: z.string().openapi({ example: 'John Doe' }),
    initials: z.string().openapi({ example: 'JD' }),
    avatarUrl: z
      .string()
      .url()
      .optional()
      .openapi({ example: 'https://example.com/avatar.jpg' }),
    createdAt: z.string().datetime().openapi({ example: EXAMPLE_DATETIME }),
    calendarSyncEnabled: z.boolean().default(false).openapi({ example: false }),
    pushToken: z
      .string()
      .optional()
      .openapi({ example: 'ExponentPushToken[xxxxxx]' }),
    timezone: z
      .string()
      .default('America/New_York')
      .openapi({ example: 'America/New_York' }),
    friendCode: z.string().optional().openapi({ example: 'ABC123' }),
  })
  .openapi('User');

export const CreateUserSchema = z
  .object({
    appleUserId: z
      .string()
      .min(1)
      .openapi({ example: '001234.abcdef1234567890.1234' }),
    email: z.string().email().openapi({ example: 'john@example.com' }),
    firstName: z.string().min(1).max(50).openapi({ example: 'John' }),
    lastName: z.string().min(1).max(50).openapi({ example: 'Doe' }),
    avatarUrl: z
      .string()
      .url()
      .optional()
      .openapi({ example: 'https://example.com/avatar.jpg' }),
    timezone: z.string().optional().openapi({ example: 'America/New_York' }),
  })
  .openapi('CreateUser');

export const UpdateUserSchema = z
  .object({
    avatarUrl: z
      .string()
      .url()
      .nullable()
      .optional()
      .openapi({ example: 'https://example.com/avatar.jpg' }),
    timezone: z.string().optional().openapi({ example: 'America/New_York' }),
    calendarSyncEnabled: z.boolean().optional().openapi({ example: true }),
  })
  .openapi('UpdateUser');

// Friendship schemas
export const FriendshipStatusSchema = z
  .enum(['pending', 'accepted', 'blocked'])
  .openapi('FriendshipStatus');

export const FriendshipSchema = z
  .object({
    userId: z.string().uuid().openapi({ example: EXAMPLE_UUID }),
    friendId: z.string().uuid().openapi({ example: EXAMPLE_UUID_2 }),
    status: FriendshipStatusSchema,
    initiatedBy: z.string().uuid().openapi({ example: EXAMPLE_UUID }),
    createdAt: z.string().datetime().openapi({ example: EXAMPLE_DATETIME }),
    acceptedAt: z
      .string()
      .datetime()
      .optional()
      .openapi({ example: EXAMPLE_DATETIME }),
  })
  .openapi('Friendship');

export const FriendWithUserSchema = z
  .object({
    userId: z.string().uuid().openapi({ example: EXAMPLE_UUID }),
    friendId: z.string().uuid().openapi({ example: EXAMPLE_UUID_2 }),
    status: FriendshipStatusSchema,
    initiatedBy: z.string().uuid().openapi({ example: EXAMPLE_UUID }),
    createdAt: z.string().datetime().openapi({ example: EXAMPLE_DATETIME }),
    acceptedAt: z
      .string()
      .datetime()
      .optional()
      .openapi({ example: EXAMPLE_DATETIME }),
    friend: UserSchema,
  })
  .openapi('FriendWithUser');

// Friend request can be by userId or friendCode
export const FriendRequestSchema = z
  .object({
    friendUserId: z
      .string()
      .uuid()
      .optional()
      .openapi({ example: EXAMPLE_UUID_2 }),
    friendCode: z.string().optional().openapi({ example: 'ABC123' }),
  })
  .refine((data) => data.friendUserId || data.friendCode, {
    message: 'Either friendUserId or friendCode is required',
  })
  .openapi('FriendRequest');

// Group schemas
export const GroupSchema = z
  .object({
    groupId: z.string().uuid().openapi({ example: EXAMPLE_UUID }),
    ownerId: z.string().uuid().openapi({ example: EXAMPLE_UUID }),
    name: z.string().min(1).max(50).openapi({ example: 'Weekend Crew' }),
    emoji: z.string().optional().openapi({ example: '🎉' }),
    memberIds: z
      .array(z.string().uuid())
      .openapi({ example: [EXAMPLE_UUID, EXAMPLE_UUID_2] }),
    isDefault: z.boolean().default(false).openapi({ example: false }),
    createdAt: z.string().datetime().openapi({ example: EXAMPLE_DATETIME }),
  })
  .openapi('Group');

export const CreateGroupSchema = z
  .object({
    name: z.string().min(1).max(50).openapi({ example: 'Weekend Crew' }),
    emoji: z.string().optional().openapi({ example: '🎉' }),
    memberIds: z
      .array(z.string().uuid())
      .default([])
      .openapi({ example: [EXAMPLE_UUID_2] }),
  })
  .openapi('CreateGroup');

export const UpdateGroupSchema = z
  .object({
    name: z
      .string()
      .min(1)
      .max(50)
      .optional()
      .openapi({ example: 'New Group Name' }),
    emoji: z.string().nullable().optional().openapi({ example: '🎊' }),
    memberIds: z
      .array(z.string().uuid())
      .optional()
      .openapi({ example: [EXAMPLE_UUID, EXAMPLE_UUID_2] }),
  })
  .openapi('UpdateGroup');

// Blocked window schemas (times when user is NOT available)
export const RecurringPatternSchema = z
  .enum(['daily', 'weekly', 'biweekly', 'monthly'])
  .openapi('RecurringPattern');

export const RecurringSchema = z
  .object({
    pattern: RecurringPatternSchema,
    daysOfWeek: z
      .array(z.number().min(0).max(6))
      .optional()
      .openapi({ example: [1, 3, 5] }),
    endDate: z
      .string()
      .datetime()
      .optional()
      .openapi({ example: '2024-12-31T23:59:59.000Z' }),
  })
  .openapi('Recurring');

export const BlockedWindowSchema = z
  .object({
    userId: z.string().uuid().openapi({ example: EXAMPLE_UUID }),
    windowId: z.string().uuid().openapi({ example: EXAMPLE_UUID_2 }),
    startTime: z
      .string()
      .datetime()
      .openapi({ example: '2024-01-15T14:00:00.000Z' }),
    endTime: z
      .string()
      .datetime()
      .openapi({ example: '2024-01-15T18:00:00.000Z' }),
    recurring: RecurringSchema.optional(),
    notes: z.string().max(500).optional().openapi({ example: 'Work meeting' }),
    createdAt: z.string().datetime().openapi({ example: EXAMPLE_DATETIME }),
  })
  .openapi('BlockedWindow');

export const CreateBlockedWindowSchema = z
  .object({
    startTime: z
      .string()
      .datetime()
      .openapi({ example: '2024-01-15T14:00:00.000Z' }),
    endTime: z
      .string()
      .datetime()
      .openapi({ example: '2024-01-15T18:00:00.000Z' }),
    recurring: RecurringSchema.optional(),
    notes: z.string().max(500).optional().openapi({ example: 'Work meeting' }),
  })
  .openapi('CreateBlockedWindow');

export const UpdateBlockedWindowSchema = z
  .object({
    startTime: z
      .string()
      .datetime()
      .optional()
      .openapi({ example: '2024-01-15T14:00:00.000Z' }),
    endTime: z
      .string()
      .datetime()
      .optional()
      .openapi({ example: '2024-01-15T18:00:00.000Z' }),
    recurring: RecurringSchema.nullable().optional(),
    notes: z
      .string()
      .max(500)
      .nullable()
      .optional()
      .openapi({ example: 'Updated notes' }),
  })
  .openapi('UpdateBlockedWindow');

// Event schemas
export const InviteeStatusSchema = z
  .enum(['pending', 'accepted', 'declined', 'maybe'])
  .openapi('InviteeStatus');
export const EventStatusSchema = z
  .enum(['draft', 'active', 'cancelled'])
  .openapi('EventStatus');

export const LocationDataSchema = z
  .object({
    name: z.string().max(200).openapi({ example: 'Spyhouse Coffee' }),
    address: z
      .string()
      .openapi({ example: '945 Broadway St NE, Minneapolis, MN 55413' }),
    placeId: z.string().openapi({ example: 'ChIJN1t_tDeuEmsRUsoyG83frY4' }),
    latitude: z.string().optional().openapi({ example: '45.0012' }),
    longitude: z.string().optional().openapi({ example: '-93.2342' }),
  })
  .openapi('LocationData');

export const CounterProposalSchema = z
  .object({
    startTime: z
      .string()
      .datetime()
      .optional()
      .openapi({ example: '2024-01-15T15:00:00.000Z' }),
    endTime: z
      .string()
      .datetime()
      .optional()
      .openapi({ example: '2024-01-15T17:00:00.000Z' }),
    location: z
      .string()
      .max(200)
      .optional()
      .openapi({ example: 'Central Park' }),
    message: z
      .string()
      .max(500)
      .optional()
      .openapi({ example: 'Can we do an hour later?' }),
  })
  .openapi('CounterProposal');

export const EventInviteeSchema = z
  .object({
    userId: z.string().uuid().openapi({ example: EXAMPLE_UUID_2 }),
    fullName: z.string().openapi({ example: 'Jane Smith' }),
    initials: z.string().openapi({ example: 'JS' }),
    avatarUrl: z
      .string()
      .url()
      .optional()
      .openapi({ example: 'https://example.com/avatar.jpg' }),
    status: InviteeStatusSchema,
    respondedAt: z
      .string()
      .datetime()
      .optional()
      .openapi({ example: EXAMPLE_DATETIME }),
    counterProposal: CounterProposalSchema.optional(),
  })
  .openapi('EventInvitee');

export const EventSchema = z
  .object({
    eventId: z.string().uuid().openapi({ example: EXAMPLE_UUID }),
    hostId: z.string().uuid().openapi({ example: EXAMPLE_UUID }),
    hostName: z.string().openapi({ example: 'John Doe' }),
    hostInitials: z.string().openapi({ example: 'JD' }),
    hostAvatarUrl: z
      .string()
      .url()
      .optional()
      .openapi({ example: 'https://example.com/avatar.jpg' }),
    title: z.string().min(1).max(100).openapi({ example: 'Coffee Catch-up' }),
    emoji: z.string().optional().openapi({ example: '☕' }),
    startTime: z
      .string()
      .datetime()
      .openapi({ example: '2024-01-15T14:00:00.000Z' }),
    endTime: z
      .string()
      .datetime()
      .openapi({ example: '2024-01-15T15:00:00.000Z' }),
    location: z
      .string()
      .max(200)
      .optional()
      .openapi({ example: 'Blue Bottle Coffee, SoHo' }),
    locationPlaceId: z
      .string()
      .optional()
      .openapi({ example: 'ChIJN1t_tDeuEmsRUsoyG83frY4' }),
    locationAddress: z
      .string()
      .optional()
      .openapi({ example: '945 Broadway St NE, Minneapolis, MN 55413' }),
    latitude: z.string().optional().openapi({ example: '45.0012' }),
    longitude: z.string().optional().openapi({ example: '-93.2342' }),
    notes: z
      .string()
      .max(500)
      .optional()
      .openapi({ example: 'Looking forward to catching up!' }),
    invitees: z.array(EventInviteeSchema),
    showInviteList: z.boolean().default(true).openapi({ example: true }),
    status: EventStatusSchema,
    calendarEventId: z
      .string()
      .optional()
      .openapi({ example: 'google_calendar_event_123' }),
    createdAt: z.string().datetime().openapi({ example: EXAMPLE_DATETIME }),
    updatedAt: z.string().datetime().openapi({ example: EXAMPLE_DATETIME }),
  })
  .openapi('Event');

export const EventRecurringSchema = z
  .object({
    isRecurring: z.boolean().openapi({ example: true }),
    pattern: z.enum(['weekly']).optional().openapi({ example: 'weekly' }),
    daysOfWeek: z
      .array(z.number().min(0).max(6))
      .optional()
      .openapi({ example: [1, 3, 5] }),
    endDate: z
      .string()
      .datetime()
      .optional()
      .openapi({ example: '2024-03-15T23:59:59.000Z' }),
  })
  .openapi('EventRecurring');

export const CreateEventSchema = z
  .object({
    title: z.string().min(1).max(100).openapi({ example: 'Coffee Catch-up' }),
    emoji: z.string().optional().openapi({ example: '☕' }),
    startTime: z
      .string()
      .datetime()
      .openapi({ example: '2024-01-15T14:00:00.000Z' }),
    endTime: z
      .string()
      .datetime()
      .openapi({ example: '2024-01-15T15:00:00.000Z' }),
    location: z
      .string()
      .max(200)
      .optional()
      .openapi({ example: 'Blue Bottle Coffee, SoHo' }),
    locationData: LocationDataSchema.optional(),
    notes: z
      .string()
      .max(500)
      .optional()
      .openapi({ example: 'Looking forward to catching up!' }),
    inviteeIds: z
      .array(z.string().uuid())
      .openapi({ example: [EXAMPLE_UUID_2] }),
    showInviteList: z.boolean().default(true).openapi({ example: true }),
    recurring: EventRecurringSchema.optional(),
  })
  .openapi('CreateEvent');

export const UpdateEventSchema = z
  .object({
    title: z
      .string()
      .min(1)
      .max(100)
      .optional()
      .openapi({ example: 'Updated Event Title' }),
    emoji: z.string().nullable().optional().openapi({ example: '🎉' }),
    startTime: z
      .string()
      .datetime()
      .optional()
      .openapi({ example: '2024-01-15T14:00:00.000Z' }),
    endTime: z
      .string()
      .datetime()
      .optional()
      .openapi({ example: '2024-01-15T15:00:00.000Z' }),
    location: z
      .string()
      .max(200)
      .nullable()
      .optional()
      .openapi({ example: 'New Location' }),
    locationData: LocationDataSchema.nullable().optional(),
    notes: z
      .string()
      .max(500)
      .nullable()
      .optional()
      .openapi({ example: 'Updated notes' }),
    showInviteList: z.boolean().optional().openapi({ example: false }),
  })
  .openapi('UpdateEvent');

export const EventResponseSchema = z
  .object({
    status: InviteeStatusSchema,
    counterProposal: CounterProposalSchema.optional(),
  })
  .openapi('EventResponse');

// Push token schema
export const RegisterPushTokenSchema = z
  .object({
    pushToken: z
      .string()
      .min(1)
      .openapi({ example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]' }),
  })
  .openapi('RegisterPushToken');

// Notification preferences schema
export const NotificationPreferencesSchema = z
  .object({
    eventInvites: z.boolean().default(true).openapi({ example: true }),
    eventUpdates: z.boolean().default(true).openapi({ example: true }),
    friendRequests: z.boolean().default(true).openapi({ example: true }),
    messages: z.boolean().default(true).openapi({ example: true }),
  })
  .openapi('NotificationPreferences');

export const UpdateNotificationPreferencesSchema = z
  .object({
    eventInvites: z.boolean().optional().openapi({ example: true }),
    eventUpdates: z.boolean().optional().openapi({ example: true }),
    friendRequests: z.boolean().optional().openapi({ example: false }),
    messages: z.boolean().optional().openapi({ example: true }),
  })
  .openapi('UpdateNotificationPreferences');

// User search schema
export const UserSearchSchema = z
  .object({
    query: z.string().min(1).max(100).openapi({ example: 'John' }),
  })
  .openapi('UserSearch');

// ============================================
// API Response Schemas for OpenAPI
// ============================================

export const ErrorResponseSchema = z
  .object({
    success: z.literal(false),
    error: z.string().openapi({ example: 'Validation Error' }),
    message: z.string().openapi({ example: 'Invalid input provided' }),
  })
  .openapi('ErrorResponse');

// Generic success response factory
export const createSuccessResponseSchema = <T extends z.ZodTypeAny>(
  dataSchema: T,
  name: string,
) =>
  z
    .object({
      success: z.literal(true),
      data: dataSchema,
      message: z
        .string()
        .optional()
        .openapi({ example: 'Operation successful' }),
    })
    .openapi(name);

// ============================================
// TypeScript Types (inferred from schemas)
// ============================================

export type User = z.infer<typeof UserSchema>;
export type CreateUser = z.infer<typeof CreateUserSchema>;
export type UpdateUser = z.infer<typeof UpdateUserSchema>;

export type FriendshipStatus = z.infer<typeof FriendshipStatusSchema>;
export type Friendship = z.infer<typeof FriendshipSchema>;
export type FriendWithUser = z.infer<typeof FriendWithUserSchema>;
export type FriendRequest = z.infer<typeof FriendRequestSchema>;

export type Group = z.infer<typeof GroupSchema>;
export type CreateGroup = z.infer<typeof CreateGroupSchema>;
export type UpdateGroup = z.infer<typeof UpdateGroupSchema>;

export type RecurringPattern = z.infer<typeof RecurringPatternSchema>;
export type Recurring = z.infer<typeof RecurringSchema>;
export type BlockedWindow = z.infer<typeof BlockedWindowSchema>;
export type CreateBlockedWindow = z.infer<typeof CreateBlockedWindowSchema>;
export type UpdateBlockedWindow = z.infer<typeof UpdateBlockedWindowSchema>;

export type InviteeStatus = z.infer<typeof InviteeStatusSchema>;
export type EventStatus = z.infer<typeof EventStatusSchema>;
export type CounterProposal = z.infer<typeof CounterProposalSchema>;
export type LocationData = z.infer<typeof LocationDataSchema>;
export type EventRecurring = z.infer<typeof EventRecurringSchema>;
export type EventInvitee = z.infer<typeof EventInviteeSchema>;
export type Event = z.infer<typeof EventSchema>;
export type CreateEvent = z.infer<typeof CreateEventSchema>;
export type UpdateEvent = z.infer<typeof UpdateEventSchema>;
export type EventResponse = z.infer<typeof EventResponseSchema>;

export type RegisterPushToken = z.infer<typeof RegisterPushTokenSchema>;
export type NotificationPreferences = z.infer<
  typeof NotificationPreferencesSchema
>;
export type UpdateNotificationPreferences = z.infer<
  typeof UpdateNotificationPreferencesSchema
>;
export type UserSearch = z.infer<typeof UserSearchSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

// Calendar schemas
export const CalendarProviderSchema = z
  .enum(['apple', 'google', 'outlook'])
  .openapi('CalendarProvider');

export const CalendarConnectionSchema = z
  .object({
    connectionId: z.string().uuid().openapi({ example: EXAMPLE_UUID }),
    userId: z.string().uuid().openapi({ example: EXAMPLE_UUID }),
    provider: CalendarProviderSchema,
    externalCalendarId: z.string().openapi({ example: 'primary' }),
    calendarName: z.string().openapi({ example: 'Personal Calendar' }),
    color: z.string().optional().openapi({ example: '#4285F4' }),
    importEnabled: z.boolean().openapi({ example: true }),
    exportEnabled: z.boolean().openapi({ example: false }),
    lastSyncAt: z
      .string()
      .datetime()
      .optional()
      .openapi({ example: EXAMPLE_DATETIME }),
    createdAt: z.string().datetime().openapi({ example: EXAMPLE_DATETIME }),
  })
  .openapi('CalendarConnection');

export const CreateCalendarConnectionSchema = z
  .object({
    provider: CalendarProviderSchema,
    externalCalendarId: z.string().openapi({ example: 'primary' }),
    calendarName: z.string().openapi({ example: 'Personal Calendar' }),
    color: z.string().optional().openapi({ example: '#4285F4' }),
    importEnabled: z.boolean().default(true).openapi({ example: true }),
    exportEnabled: z.boolean().default(false).openapi({ example: false }),
    accessToken: z.string().optional().openapi({ example: 'ya29.xxx' }),
    refreshToken: z.string().optional().openapi({ example: '1//xxx' }),
    tokenExpiresAt: z
      .string()
      .datetime()
      .optional()
      .openapi({ example: EXAMPLE_DATETIME }),
  })
  .openapi('CreateCalendarConnection');

export const UpdateCalendarConnectionSchema = z
  .object({
    importEnabled: z.boolean().optional().openapi({ example: true }),
    exportEnabled: z.boolean().optional().openapi({ example: true }),
    accessToken: z.string().optional().openapi({ example: 'ya29.xxx' }),
    refreshToken: z.string().optional().openapi({ example: '1//xxx' }),
    tokenExpiresAt: z
      .string()
      .datetime()
      .optional()
      .openapi({ example: EXAMPLE_DATETIME }),
  })
  .openapi('UpdateCalendarConnection');

// Sync calendars schema (bulk sync from device)
export const SyncCalendarEventSchema = z
  .object({
    externalEventId: z.string().openapi({ example: 'event_abc123' }),
    startTime: z
      .string()
      .datetime()
      .openapi({ example: '2024-01-15T14:00:00.000Z' }),
    endTime: z
      .string()
      .datetime()
      .openapi({ example: '2024-01-15T15:00:00.000Z' }),
    isBusy: z.boolean().openapi({ example: true }),
  })
  .openapi('SyncCalendarEvent');

export const SyncCalendarEntrySchema = z
  .object({
    externalCalendarId: z.string().openapi({ example: 'device_cal_123' }),
    calendarName: z.string().openapi({ example: 'Personal' }),
    color: z.string().optional().openapi({ example: '#4285F4' }),
    events: z.array(SyncCalendarEventSchema),
  })
  .openapi('SyncCalendarEntry');

export const SyncCalendarsSchema = z
  .object({
    calendars: z.array(SyncCalendarEntrySchema),
  })
  .openapi('SyncCalendars');

export type CalendarProvider = z.infer<typeof CalendarProviderSchema>;
export type CalendarConnection = z.infer<typeof CalendarConnectionSchema>;
export type CreateCalendarConnection = z.infer<
  typeof CreateCalendarConnectionSchema
>;
export type UpdateCalendarConnection = z.infer<
  typeof UpdateCalendarConnectionSchema
>;
export type SyncCalendarEvent = z.infer<typeof SyncCalendarEventSchema>;
export type SyncCalendarEntry = z.infer<typeof SyncCalendarEntrySchema>;
export type SyncCalendars = z.infer<typeof SyncCalendarsSchema>;

// Google Calendar OAuth schemas
export const GoogleAuthUrlResponseSchema = z
  .object({
    authUrl: z
      .string()
      .url()
      .openapi({ example: 'https://accounts.google.com/o/oauth2/v2/auth?...' }),
  })
  .openapi('GoogleAuthUrlResponse');

export const GoogleCallbackSchema = z
  .object({
    code: z.string().min(1).openapi({ example: '4/0AXxxxx' }),
    state: z.string().uuid().optional().openapi({
      example: '550e8400-e29b-41d4-a716-446655440000',
      description: 'The userId passed as state during auth URL generation',
    }),
  })
  .openapi('GoogleCallback');

export const GoogleCalendarSchema = z
  .object({
    externalCalendarId: z.string().openapi({ example: 'primary' }),
    calendarName: z.string().openapi({ example: 'My Calendar' }),
    color: z.string().optional().openapi({ example: '#4285F4' }),
    isPrimary: z.boolean().optional().openapi({ example: true }),
  })
  .openapi('GoogleCalendar');

export const GoogleSelectCalendarsSchema = z
  .object({
    calendarIds: z
      .array(z.string())
      .min(0)
      .openapi({
        example: ['primary', 'work@group.calendar.google.com'],
        description:
          'External calendar IDs to import. Unselected calendars will have importEnabled set to false.',
      }),
  })
  .openapi('GoogleSelectCalendars');

export type GoogleAuthUrlResponse = z.infer<typeof GoogleAuthUrlResponseSchema>;
export type GoogleCallback = z.infer<typeof GoogleCallbackSchema>;
export type GoogleCalendar = z.infer<typeof GoogleCalendarSchema>;
export type GoogleSelectCalendars = z.infer<typeof GoogleSelectCalendarsSchema>;

// Busy times query schemas
export const BusyTimesQuerySchema = z
  .object({
    userIds: z
      .array(z.string().uuid())
      .min(1)
      .openapi({
        example: [EXAMPLE_UUID, EXAMPLE_UUID_2],
        description:
          'User IDs to query busy times for (must be the current user or accepted friends)',
      }),
    startDate: z
      .string()
      .datetime()
      .openapi({ example: '2024-01-15T00:00:00.000Z' }),
    endDate: z
      .string()
      .datetime()
      .openapi({ example: '2024-01-22T23:59:59.000Z' }),
  })
  .openapi('BusyTimesQuery');

export const BusyTimeIntervalSchema = z
  .object({
    startTime: z
      .string()
      .datetime()
      .openapi({ example: '2024-01-15T14:00:00.000Z' }),
    endTime: z
      .string()
      .datetime()
      .openapi({ example: '2024-01-15T15:00:00.000Z' }),
  })
  .openapi('BusyTimeInterval');

export type BusyTimesQuery = z.infer<typeof BusyTimesQuerySchema>;
export type BusyTimeInterval = z.infer<typeof BusyTimeIntervalSchema>;
