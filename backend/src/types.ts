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
    appleUserId: z.string().min(1).openapi({ example: '001234.abcdef1234567890.1234' }),
    email: z.string().email().openapi({ example: 'john@example.com' }),
    firstName: z.string().min(1).max(50).openapi({ example: 'John' }),
    lastName: z.string().min(1).max(50).openapi({ example: 'Doe' }),
    fullName: z.string().openapi({ example: 'John Doe' }),
    initials: z.string().openapi({ example: 'JD' }),
    avatarUrl: z.string().url().optional().openapi({ example: 'https://example.com/avatar.jpg' }),
    createdAt: z.string().datetime().openapi({ example: EXAMPLE_DATETIME }),
    calendarSyncEnabled: z.boolean().default(false).openapi({ example: false }),
    pushToken: z.string().optional().openapi({ example: 'ExponentPushToken[xxxxxx]' }),
    timezone: z.string().default('America/New_York').openapi({ example: 'America/New_York' }),
    inviteCode: z.string().optional().openapi({ example: 'ABC123' }),
  })
  .openapi('User');

export const CreateUserSchema = z
  .object({
    appleUserId: z.string().min(1).openapi({ example: '001234.abcdef1234567890.1234' }),
    email: z.string().email().openapi({ example: 'john@example.com' }),
    firstName: z.string().min(1).max(50).openapi({ example: 'John' }),
    lastName: z.string().min(1).max(50).openapi({ example: 'Doe' }),
    avatarUrl: z.string().url().optional().openapi({ example: 'https://example.com/avatar.jpg' }),
    timezone: z.string().optional().openapi({ example: 'America/New_York' }),
  })
  .openapi('CreateUser');

export const UpdateUserSchema = z
  .object({
    avatarUrl: z.string().url().nullable().optional().openapi({ example: 'https://example.com/avatar.jpg' }),
    timezone: z.string().optional().openapi({ example: 'America/New_York' }),
    calendarSyncEnabled: z.boolean().optional().openapi({ example: true }),
  })
  .openapi('UpdateUser');

// Friendship schemas
export const FriendshipStatusSchema = z.enum(['pending', 'accepted', 'blocked']).openapi('FriendshipStatus');

export const FriendshipSchema = z
  .object({
    userId: z.string().uuid().openapi({ example: EXAMPLE_UUID }),
    friendId: z.string().uuid().openapi({ example: EXAMPLE_UUID_2 }),
    status: FriendshipStatusSchema,
    initiatedBy: z.string().uuid().openapi({ example: EXAMPLE_UUID }),
    createdAt: z.string().datetime().openapi({ example: EXAMPLE_DATETIME }),
    acceptedAt: z.string().datetime().optional().openapi({ example: EXAMPLE_DATETIME }),
  })
  .openapi('Friendship');

export const FriendWithUserSchema = z
  .object({
    userId: z.string().uuid().openapi({ example: EXAMPLE_UUID }),
    friendId: z.string().uuid().openapi({ example: EXAMPLE_UUID_2 }),
    status: FriendshipStatusSchema,
    initiatedBy: z.string().uuid().openapi({ example: EXAMPLE_UUID }),
    createdAt: z.string().datetime().openapi({ example: EXAMPLE_DATETIME }),
    acceptedAt: z.string().datetime().optional().openapi({ example: EXAMPLE_DATETIME }),
    friend: UserSchema,
  })
  .openapi('FriendWithUser');

// Friend request can be by userId or inviteCode
export const FriendRequestSchema = z
  .object({
    friendUserId: z.string().uuid().optional().openapi({ example: EXAMPLE_UUID_2 }),
    inviteCode: z.string().optional().openapi({ example: 'ABC123' }),
  })
  .refine((data) => data.friendUserId || data.inviteCode, {
    message: 'Either friendUserId or inviteCode is required',
  })
  .openapi('FriendRequest');

// Group schemas
export const GroupSchema = z
  .object({
    groupId: z.string().uuid().openapi({ example: EXAMPLE_UUID }),
    ownerId: z.string().uuid().openapi({ example: EXAMPLE_UUID }),
    name: z.string().min(1).max(50).openapi({ example: 'Weekend Crew' }),
    emoji: z.string().optional().openapi({ example: '🎉' }),
    memberIds: z.array(z.string().uuid()).openapi({ example: [EXAMPLE_UUID, EXAMPLE_UUID_2] }),
    isDefault: z.boolean().default(false).openapi({ example: false }),
    createdAt: z.string().datetime().openapi({ example: EXAMPLE_DATETIME }),
  })
  .openapi('Group');

export const CreateGroupSchema = z
  .object({
    name: z.string().min(1).max(50).openapi({ example: 'Weekend Crew' }),
    emoji: z.string().optional().openapi({ example: '🎉' }),
    memberIds: z.array(z.string().uuid()).default([]).openapi({ example: [EXAMPLE_UUID_2] }),
  })
  .openapi('CreateGroup');

export const UpdateGroupSchema = z
  .object({
    name: z.string().min(1).max(50).optional().openapi({ example: 'New Group Name' }),
    emoji: z.string().nullable().optional().openapi({ example: '🎊' }),
    memberIds: z.array(z.string().uuid()).optional().openapi({ example: [EXAMPLE_UUID, EXAMPLE_UUID_2] }),
  })
  .openapi('UpdateGroup');

// Activity schemas
export const ActivitySchema = z
  .object({
    activityId: z.string().uuid().openapi({ example: EXAMPLE_UUID }),
    userId: z.string().uuid().nullable().openapi({ example: EXAMPLE_UUID }),
    name: z.string().min(1).max(50).openapi({ example: 'Coffee' }),
    emoji: z.string().min(1).max(4).openapi({ example: '☕' }),
    isDefault: z.boolean().default(false).openapi({ example: false }),
    createdAt: z.string().datetime().openapi({ example: EXAMPLE_DATETIME }),
  })
  .openapi('Activity');

export const CreateActivitySchema = z
  .object({
    name: z.string().min(1).max(50).openapi({ example: 'Board Games' }),
    emoji: z.string().min(1).max(4).optional().openapi({ example: '🎲' }),
  })
  .openapi('CreateActivity');

export const UpdateActivitySchema = z
  .object({
    name: z.string().min(1).max(50).optional().openapi({ example: 'Updated Activity' }),
    emoji: z.string().min(1).max(4).optional().openapi({ example: '🎯' }),
  })
  .openapi('UpdateActivity');

// Availability schemas
export const RecurringPatternSchema = z.enum(['daily', 'weekly', 'biweekly', 'monthly']).openapi('RecurringPattern');

export const RecurringSchema = z
  .object({
    pattern: RecurringPatternSchema,
    daysOfWeek: z.array(z.number().min(0).max(6)).optional().openapi({ example: [1, 3, 5] }),
    endDate: z.string().datetime().optional().openapi({ example: '2024-12-31T23:59:59.000Z' }),
  })
  .openapi('Recurring');

export const AvailabilityWindowSchema = z
  .object({
    userId: z.string().uuid().openapi({ example: EXAMPLE_UUID }),
    windowId: z.string().uuid().openapi({ example: EXAMPLE_UUID_2 }),
    startTime: z.string().datetime().openapi({ example: '2024-01-15T14:00:00.000Z' }),
    endTime: z.string().datetime().openapi({ example: '2024-01-15T18:00:00.000Z' }),
    recurring: RecurringSchema.optional(),
    notes: z.string().max(500).optional().openapi({ example: 'Free for coffee or lunch!' }),
    createdAt: z.string().datetime().openapi({ example: EXAMPLE_DATETIME }),
  })
  .openapi('AvailabilityWindow');

export const CreateAvailabilitySchema = z
  .object({
    startTime: z.string().datetime().openapi({ example: '2024-01-15T14:00:00.000Z' }),
    endTime: z.string().datetime().openapi({ example: '2024-01-15T18:00:00.000Z' }),
    recurring: RecurringSchema.optional(),
    notes: z.string().max(500).optional().openapi({ example: 'Free for coffee or lunch!' }),
  })
  .openapi('CreateAvailability');

export const UpdateAvailabilitySchema = z
  .object({
    startTime: z.string().datetime().optional().openapi({ example: '2024-01-15T14:00:00.000Z' }),
    endTime: z.string().datetime().optional().openapi({ example: '2024-01-15T18:00:00.000Z' }),
    recurring: RecurringSchema.nullable().optional(),
    notes: z.string().max(500).nullable().optional().openapi({ example: 'Updated notes' }),
  })
  .openapi('UpdateAvailability');

// Event schemas
export const InviteeStatusSchema = z.enum(['pending', 'accepted', 'declined', 'maybe']).openapi('InviteeStatus');
export const EventStatusSchema = z.enum(['draft', 'sent', 'confirmed', 'cancelled']).openapi('EventStatus');
export const CommitmentTypeSchema = z.enum(['going', 'planning']).openapi('CommitmentType');

export const LocationDataSchema = z
  .object({
    name: z.string().max(200).openapi({ example: 'Spyhouse Coffee' }),
    address: z.string().openapi({ example: '945 Broadway St NE, Minneapolis, MN 55413' }),
    placeId: z.string().openapi({ example: 'ChIJN1t_tDeuEmsRUsoyG83frY4' }),
    latitude: z.string().optional().openapi({ example: '45.0012' }),
    longitude: z.string().optional().openapi({ example: '-93.2342' }),
  })
  .openapi('LocationData');

export const CounterProposalSchema = z
  .object({
    startTime: z.string().datetime().optional().openapi({ example: '2024-01-15T15:00:00.000Z' }),
    endTime: z.string().datetime().optional().openapi({ example: '2024-01-15T17:00:00.000Z' }),
    location: z.string().max(200).optional().openapi({ example: 'Central Park' }),
    activityId: z.string().uuid().optional().openapi({ example: EXAMPLE_UUID }),
    message: z.string().max(500).optional().openapi({ example: 'Can we do an hour later?' }),
  })
  .openapi('CounterProposal');

export const EventInviteeSchema = z
  .object({
    userId: z.string().uuid().openapi({ example: EXAMPLE_UUID_2 }),
    fullName: z.string().openapi({ example: 'Jane Smith' }),
    initials: z.string().openapi({ example: 'JS' }),
    avatarUrl: z.string().url().optional().openapi({ example: 'https://example.com/avatar.jpg' }),
    status: InviteeStatusSchema,
    respondedAt: z.string().datetime().optional().openapi({ example: EXAMPLE_DATETIME }),
    counterProposal: CounterProposalSchema.optional(),
  })
  .openapi('EventInvitee');

export const EventSchema = z
  .object({
    eventId: z.string().uuid().openapi({ example: EXAMPLE_UUID }),
    hostId: z.string().uuid().openapi({ example: EXAMPLE_UUID }),
    hostName: z.string().openapi({ example: 'John Doe' }),
    hostInitials: z.string().openapi({ example: 'JD' }),
    hostAvatarUrl: z.string().url().optional().openapi({ example: 'https://example.com/avatar.jpg' }),
    title: z.string().min(1).max(100).openapi({ example: 'Coffee Catch-up' }),
    activityId: z.string().uuid().optional().openapi({ example: EXAMPLE_UUID }),
    emoji: z.string().optional().openapi({ example: '☕' }),
    startTime: z.string().datetime().openapi({ example: '2024-01-15T14:00:00.000Z' }),
    endTime: z.string().datetime().openapi({ example: '2024-01-15T15:00:00.000Z' }),
    location: z.string().max(200).optional().openapi({ example: 'Blue Bottle Coffee, SoHo' }),
    locationPlaceId: z.string().optional().openapi({ example: 'ChIJN1t_tDeuEmsRUsoyG83frY4' }),
    locationAddress: z.string().optional().openapi({ example: '945 Broadway St NE, Minneapolis, MN 55413' }),
    latitude: z.string().optional().openapi({ example: '45.0012' }),
    longitude: z.string().optional().openapi({ example: '-93.2342' }),
    notes: z.string().max(500).optional().openapi({ example: 'Looking forward to catching up!' }),
    invitees: z.array(EventInviteeSchema),
    showInviteList: z.boolean().default(true).openapi({ example: true }),
    status: EventStatusSchema,
    commitmentType: CommitmentTypeSchema.default('going').openapi({ example: 'going' }),
    calendarEventId: z.string().optional().openapi({ example: 'google_calendar_event_123' }),
    createdAt: z.string().datetime().openapi({ example: EXAMPLE_DATETIME }),
    updatedAt: z.string().datetime().openapi({ example: EXAMPLE_DATETIME }),
  })
  .openapi('Event');

export const EventRecurringSchema = z
  .object({
    isRecurring: z.boolean().openapi({ example: true }),
    pattern: z.enum(['weekly']).optional().openapi({ example: 'weekly' }),
    daysOfWeek: z.array(z.number().min(0).max(6)).optional().openapi({ example: [1, 3, 5] }),
    endDate: z.string().datetime().optional().openapi({ example: '2024-03-15T23:59:59.000Z' }),
  })
  .openapi('EventRecurring');

export const CreateEventSchema = z
  .object({
    title: z.string().min(1).max(100).openapi({ example: 'Coffee Catch-up' }),
    activityId: z.string().uuid().optional().openapi({ example: EXAMPLE_UUID }),
    emoji: z.string().optional().openapi({ example: '☕' }),
    startTime: z.string().datetime().openapi({ example: '2024-01-15T14:00:00.000Z' }),
    endTime: z.string().datetime().openapi({ example: '2024-01-15T15:00:00.000Z' }),
    location: z.string().max(200).optional().openapi({ example: 'Blue Bottle Coffee, SoHo' }),
    locationData: LocationDataSchema.optional(),
    notes: z.string().max(500).optional().openapi({ example: 'Looking forward to catching up!' }),
    inviteeIds: z.array(z.string().uuid()).openapi({ example: [EXAMPLE_UUID_2] }),
    showInviteList: z.boolean().default(true).openapi({ example: true }),
    commitmentType: CommitmentTypeSchema.default('going').openapi({ example: 'going' }),
    recurring: EventRecurringSchema.optional(),
  })
  .openapi('CreateEvent');

export const UpdateEventSchema = z
  .object({
    title: z.string().min(1).max(100).optional().openapi({ example: 'Updated Event Title' }),
    activityId: z.string().uuid().nullable().optional().openapi({ example: EXAMPLE_UUID }),
    emoji: z.string().nullable().optional().openapi({ example: '🎉' }),
    startTime: z.string().datetime().optional().openapi({ example: '2024-01-15T14:00:00.000Z' }),
    endTime: z.string().datetime().optional().openapi({ example: '2024-01-15T15:00:00.000Z' }),
    location: z.string().max(200).nullable().optional().openapi({ example: 'New Location' }),
    locationData: LocationDataSchema.nullable().optional(),
    notes: z.string().max(500).nullable().optional().openapi({ example: 'Updated notes' }),
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
    pushToken: z.string().min(1).openapi({ example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]' }),
  })
  .openapi('RegisterPushToken');

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
export const createSuccessResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T, name: string) =>
  z
    .object({
      success: z.literal(true),
      data: dataSchema,
      message: z.string().optional().openapi({ example: 'Operation successful' }),
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

export type Activity = z.infer<typeof ActivitySchema>;
export type CreateActivity = z.infer<typeof CreateActivitySchema>;
export type UpdateActivity = z.infer<typeof UpdateActivitySchema>;

export type RecurringPattern = z.infer<typeof RecurringPatternSchema>;
export type Recurring = z.infer<typeof RecurringSchema>;
export type AvailabilityWindow = z.infer<typeof AvailabilityWindowSchema>;
export type CreateAvailability = z.infer<typeof CreateAvailabilitySchema>;
export type UpdateAvailability = z.infer<typeof UpdateAvailabilitySchema>;

export type InviteeStatus = z.infer<typeof InviteeStatusSchema>;
export type EventStatus = z.infer<typeof EventStatusSchema>;
export type CommitmentType = z.infer<typeof CommitmentTypeSchema>;
export type CounterProposal = z.infer<typeof CounterProposalSchema>;
export type LocationData = z.infer<typeof LocationDataSchema>;
export type EventRecurring = z.infer<typeof EventRecurringSchema>;
export type EventInvitee = z.infer<typeof EventInviteeSchema>;
export type Event = z.infer<typeof EventSchema>;
export type CreateEvent = z.infer<typeof CreateEventSchema>;
export type UpdateEvent = z.infer<typeof UpdateEventSchema>;
export type EventResponse = z.infer<typeof EventResponseSchema>;

export type RegisterPushToken = z.infer<typeof RegisterPushTokenSchema>;
export type UserSearch = z.infer<typeof UserSearchSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

// Calendar schemas
export const CalendarProviderSchema = z.enum(['apple', 'google', 'outlook']).openapi('CalendarProvider');

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
    lastSyncAt: z.string().datetime().optional().openapi({ example: EXAMPLE_DATETIME }),
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
    tokenExpiresAt: z.string().datetime().optional().openapi({ example: EXAMPLE_DATETIME }),
  })
  .openapi('CreateCalendarConnection');

export const UpdateCalendarConnectionSchema = z
  .object({
    importEnabled: z.boolean().optional().openapi({ example: true }),
    exportEnabled: z.boolean().optional().openapi({ example: true }),
    accessToken: z.string().optional().openapi({ example: 'ya29.xxx' }),
    refreshToken: z.string().optional().openapi({ example: '1//xxx' }),
    tokenExpiresAt: z.string().datetime().optional().openapi({ example: EXAMPLE_DATETIME }),
  })
  .openapi('UpdateCalendarConnection');

export const BusySlotSchema = z
  .object({
    startTime: z.string().datetime().openapi({ example: '2024-01-15T14:00:00.000Z' }),
    endTime: z.string().datetime().openapi({ example: '2024-01-15T15:00:00.000Z' }),
    calendarName: z.string().optional().openapi({ example: 'Work Calendar' }),
  })
  .openapi('BusySlot');

export type CalendarProvider = z.infer<typeof CalendarProviderSchema>;
export type CalendarConnection = z.infer<typeof CalendarConnectionSchema>;
export type CreateCalendarConnection = z.infer<typeof CreateCalendarConnectionSchema>;
export type UpdateCalendarConnection = z.infer<typeof UpdateCalendarConnectionSchema>;
export type BusySlot = z.infer<typeof BusySlotSchema>;

// Location schemas
export const LocationSchema = z
  .object({
    locationId: z.string().uuid().openapi({ example: EXAMPLE_UUID }),
    placeId: z.string().openapi({ example: 'ChIJN1t_tDeuEmsRUsoyG83frY4' }),
    name: z.string().openapi({ example: 'Spyhouse Coffee' }),
    address: z.string().optional().openapi({ example: '945 Broadway St NE, Minneapolis, MN 55413' }),
    latitude: z.string().optional().openapi({ example: '45.0012' }),
    longitude: z.string().optional().openapi({ example: '-93.2342' }),
  })
  .openapi('Location');

export const PlaceSearchResultSchema = z
  .object({
    placeId: z.string().openapi({ example: 'ChIJN1t_tDeuEmsRUsoyG83frY4' }),
    name: z.string().openapi({ example: 'Spyhouse Coffee' }),
    address: z.string().openapi({ example: '945 Broadway St NE, Minneapolis, MN 55413' }),
  })
  .openapi('PlaceSearchResult');

export type Location = z.infer<typeof LocationSchema>;
export type PlaceSearchResult = z.infer<typeof PlaceSearchResultSchema>;

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface AuthResponse {
  user: User;
  isNewUser: boolean;
}
