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
    cognitoId: z.string().min(1).openapi({ example: 'us-east-1_abc123|user123' }),
    email: z.string().email().openapi({ example: 'john@example.com' }),
    displayName: z.string().min(1).max(50).openapi({ example: 'John Doe' }),
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
    cognitoId: z.string().min(1).openapi({ example: 'us-east-1_abc123|user123' }),
    email: z.string().email().openapi({ example: 'john@example.com' }),
    displayName: z.string().min(1).max(50).openapi({ example: 'John Doe' }),
    avatarUrl: z.string().url().optional().openapi({ example: 'https://example.com/avatar.jpg' }),
    timezone: z.string().optional().openapi({ example: 'America/New_York' }),
  })
  .openapi('CreateUser');

export const UpdateUserSchema = z
  .object({
    displayName: z.string().min(1).max(50).optional().openapi({ example: 'John Doe' }),
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
    customName: z.string().max(50).optional().openapi({ example: 'Best Friend' }),
  })
  .openapi('Friendship');

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
    emoji: z.string().min(1).max(4).openapi({ example: '🎲' }),
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

export const VisibilityTypeSchema = z.enum(['all', 'groups', 'specific']).openapi('VisibilityType');

export const VisibilitySchema = z
  .object({
    type: VisibilityTypeSchema,
    groupIds: z.array(z.string().uuid()).optional().openapi({ example: [EXAMPLE_UUID] }),
    userIds: z.array(z.string().uuid()).optional().openapi({ example: [EXAMPLE_UUID_2] }),
  })
  .openapi('Visibility');

export const AvailabilityWindowSchema = z
  .object({
    userId: z.string().uuid().openapi({ example: EXAMPLE_UUID }),
    windowId: z.string().uuid().openapi({ example: EXAMPLE_UUID_2 }),
    startTime: z.string().datetime().openapi({ example: '2024-01-15T14:00:00.000Z' }),
    endTime: z.string().datetime().openapi({ example: '2024-01-15T18:00:00.000Z' }),
    recurring: RecurringSchema.optional(),
    visibleTo: VisibilitySchema,
    preferredActivities: z.array(z.string().uuid()).optional().openapi({ example: [EXAMPLE_UUID] }),
    notes: z.string().max(500).optional().openapi({ example: 'Free for coffee or lunch!' }),
    createdAt: z.string().datetime().openapi({ example: EXAMPLE_DATETIME }),
  })
  .openapi('AvailabilityWindow');

export const CreateAvailabilitySchema = z
  .object({
    startTime: z.string().datetime().openapi({ example: '2024-01-15T14:00:00.000Z' }),
    endTime: z.string().datetime().openapi({ example: '2024-01-15T18:00:00.000Z' }),
    recurring: RecurringSchema.optional(),
    visibleTo: VisibilitySchema,
    preferredActivities: z.array(z.string().uuid()).optional().openapi({ example: [EXAMPLE_UUID] }),
    notes: z.string().max(500).optional().openapi({ example: 'Free for coffee or lunch!' }),
  })
  .openapi('CreateAvailability');

export const UpdateAvailabilitySchema = z
  .object({
    startTime: z.string().datetime().optional().openapi({ example: '2024-01-15T14:00:00.000Z' }),
    endTime: z.string().datetime().optional().openapi({ example: '2024-01-15T18:00:00.000Z' }),
    recurring: RecurringSchema.nullable().optional(),
    visibleTo: VisibilitySchema.optional(),
    preferredActivities: z.array(z.string().uuid()).nullable().optional().openapi({ example: [EXAMPLE_UUID] }),
    notes: z.string().max(500).nullable().optional().openapi({ example: 'Updated notes' }),
  })
  .openapi('UpdateAvailability');

// Event schemas
export const InviteeStatusSchema = z.enum(['pending', 'accepted', 'declined', 'maybe']).openapi('InviteeStatus');
export const EventStatusSchema = z.enum(['draft', 'sent', 'confirmed', 'cancelled']).openapi('EventStatus');

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
    status: InviteeStatusSchema,
    respondedAt: z.string().datetime().optional().openapi({ example: EXAMPLE_DATETIME }),
    counterProposal: CounterProposalSchema.optional(),
  })
  .openapi('EventInvitee');

export const EventSchema = z
  .object({
    eventId: z.string().uuid().openapi({ example: EXAMPLE_UUID }),
    hostId: z.string().uuid().openapi({ example: EXAMPLE_UUID }),
    title: z.string().min(1).max(100).openapi({ example: 'Coffee Catch-up' }),
    activityId: z.string().uuid().optional().openapi({ example: EXAMPLE_UUID }),
    emoji: z.string().optional().openapi({ example: '☕' }),
    startTime: z.string().datetime().openapi({ example: '2024-01-15T14:00:00.000Z' }),
    endTime: z.string().datetime().openapi({ example: '2024-01-15T15:00:00.000Z' }),
    location: z.string().max(200).optional().openapi({ example: 'Blue Bottle Coffee, SoHo' }),
    notes: z.string().max(500).optional().openapi({ example: 'Looking forward to catching up!' }),
    invitees: z.array(EventInviteeSchema),
    showInviteList: z.boolean().default(true).openapi({ example: true }),
    status: EventStatusSchema,
    calendarEventId: z.string().optional().openapi({ example: 'google_calendar_event_123' }),
    createdAt: z.string().datetime().openapi({ example: EXAMPLE_DATETIME }),
    updatedAt: z.string().datetime().openapi({ example: EXAMPLE_DATETIME }),
  })
  .openapi('Event');

export const CreateEventSchema = z
  .object({
    title: z.string().min(1).max(100).openapi({ example: 'Coffee Catch-up' }),
    activityId: z.string().uuid().optional().openapi({ example: EXAMPLE_UUID }),
    emoji: z.string().optional().openapi({ example: '☕' }),
    startTime: z.string().datetime().openapi({ example: '2024-01-15T14:00:00.000Z' }),
    endTime: z.string().datetime().openapi({ example: '2024-01-15T15:00:00.000Z' }),
    location: z.string().max(200).optional().openapi({ example: 'Blue Bottle Coffee, SoHo' }),
    notes: z.string().max(500).optional().openapi({ example: 'Looking forward to catching up!' }),
    inviteeIds: z.array(z.string().uuid()).openapi({ example: [EXAMPLE_UUID_2] }),
    showInviteList: z.boolean().default(true).openapi({ example: true }),
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
export type FriendRequest = z.infer<typeof FriendRequestSchema>;

export type Group = z.infer<typeof GroupSchema>;
export type CreateGroup = z.infer<typeof CreateGroupSchema>;
export type UpdateGroup = z.infer<typeof UpdateGroupSchema>;

export type Activity = z.infer<typeof ActivitySchema>;
export type CreateActivity = z.infer<typeof CreateActivitySchema>;
export type UpdateActivity = z.infer<typeof UpdateActivitySchema>;

export type RecurringPattern = z.infer<typeof RecurringPatternSchema>;
export type Recurring = z.infer<typeof RecurringSchema>;
export type VisibilityType = z.infer<typeof VisibilityTypeSchema>;
export type Visibility = z.infer<typeof VisibilitySchema>;
export type AvailabilityWindow = z.infer<typeof AvailabilityWindowSchema>;
export type CreateAvailability = z.infer<typeof CreateAvailabilitySchema>;
export type UpdateAvailability = z.infer<typeof UpdateAvailabilitySchema>;

export type InviteeStatus = z.infer<typeof InviteeStatusSchema>;
export type EventStatus = z.infer<typeof EventStatusSchema>;
export type CounterProposal = z.infer<typeof CounterProposalSchema>;
export type EventInvitee = z.infer<typeof EventInviteeSchema>;
export type Event = z.infer<typeof EventSchema>;
export type CreateEvent = z.infer<typeof CreateEventSchema>;
export type UpdateEvent = z.infer<typeof UpdateEventSchema>;
export type EventResponse = z.infer<typeof EventResponseSchema>;

export type RegisterPushToken = z.infer<typeof RegisterPushTokenSchema>;
export type UserSearch = z.infer<typeof UserSearchSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

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

// ============================================
// DynamoDB Record Types (with GSI attributes)
// ============================================

export interface UserRecord extends User {
  pk: string; // USER#<userId>
  sk: string; // PROFILE
  gsi1pk: string; // COGNITO#<cognitoId>
  gsi1sk: string; // USER
}

export interface FriendshipRecord extends Friendship {
  pk: string; // USER#<userId>
  sk: string; // FRIEND#<friendId>
}

export interface GroupRecord extends Group {
  pk: string; // GROUP#<groupId>
  sk: string; // METADATA
  gsi1pk: string; // USER#<ownerId>
  gsi1sk: string; // GROUP#<groupId>
}

export interface ActivityRecord extends Activity {
  pk: string; // ACTIVITY#<activityId>
  sk: string; // METADATA
  gsi1pk: string; // USER#<userId> or SYSTEM
  gsi1sk: string; // ACTIVITY#<activityId>
}

export interface AvailabilityRecord extends AvailabilityWindow {
  pk: string; // USER#<userId>
  sk: string; // AVAILABILITY#<windowId>
}

export interface EventRecord extends Omit<Event, 'invitees'> {
  pk: string; // EVENT#<eventId>
  sk: string; // METADATA
  gsi1pk: string; // USER#<hostId>
  gsi1sk: string; // EVENT#<startTime>#<eventId>
  invitees: EventInvitee[];
}

export interface EventInviteeRecord {
  pk: string; // EVENT#<eventId>
  sk: string; // INVITEE#<userId>
  gsi1pk: string; // USER#<userId>
  gsi1sk: string; // INVITE#<status>#<startTime>#<eventId>
  eventId: string;
  userId: string;
  status: InviteeStatus;
  respondedAt?: string;
  counterProposal?: CounterProposal;
}

// Invite code record for friend invite links
export interface InviteCodeRecord {
  pk: string; // INVITE#<inviteCode>
  sk: string; // METADATA
  inviteCode: string;
  userId: string;
  createdAt: string;
}
