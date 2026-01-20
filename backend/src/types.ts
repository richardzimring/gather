import { z } from 'zod';

// ============================================
// Zod Schemas for Validation
// ============================================

// Phone number in E.164 format
export const PhoneNumberSchema = z.string().regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number format (E.164 required)');

// User schemas
export const UserSchema = z.object({
  userId: z.string().uuid(),
  phoneNumber: PhoneNumberSchema,
  displayName: z.string().min(1).max(50),
  avatarUrl: z.string().url().optional(),
  createdAt: z.string().datetime(),
  calendarSyncEnabled: z.boolean().default(false),
  pushToken: z.string().optional(),
  timezone: z.string().default('America/New_York'),
});

export const CreateUserSchema = z.object({
  phoneNumber: PhoneNumberSchema,
  displayName: z.string().min(1).max(50),
  avatarUrl: z.string().url().optional(),
  timezone: z.string().optional(),
});

export const UpdateUserSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  avatarUrl: z.string().url().nullable().optional(),
  timezone: z.string().optional(),
  calendarSyncEnabled: z.boolean().optional(),
});

// Friendship schemas
export const FriendshipStatusSchema = z.enum(['pending', 'accepted', 'blocked']);

export const FriendshipSchema = z.object({
  userId: z.string().uuid(),
  friendId: z.string().uuid(),
  status: FriendshipStatusSchema,
  initiatedBy: z.string().uuid(),
  createdAt: z.string().datetime(),
  acceptedAt: z.string().datetime().optional(),
  customName: z.string().max(50).optional(),
});

export const FriendRequestSchema = z.object({
  phoneNumber: PhoneNumberSchema,
});

// Group schemas
export const GroupSchema = z.object({
  groupId: z.string().uuid(),
  ownerId: z.string().uuid(),
  name: z.string().min(1).max(50),
  emoji: z.string().optional(),
  memberIds: z.array(z.string().uuid()),
  isDefault: z.boolean().default(false),
  createdAt: z.string().datetime(),
});

export const CreateGroupSchema = z.object({
  name: z.string().min(1).max(50),
  emoji: z.string().optional(),
  memberIds: z.array(z.string().uuid()).default([]),
});

export const UpdateGroupSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  emoji: z.string().nullable().optional(),
  memberIds: z.array(z.string().uuid()).optional(),
});

// Activity schemas
export const ActivitySchema = z.object({
  activityId: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  name: z.string().min(1).max(50),
  emoji: z.string().min(1).max(4),
  isDefault: z.boolean().default(false),
  createdAt: z.string().datetime(),
});

export const CreateActivitySchema = z.object({
  name: z.string().min(1).max(50),
  emoji: z.string().min(1).max(4),
});

export const UpdateActivitySchema = z.object({
  name: z.string().min(1).max(50).optional(),
  emoji: z.string().min(1).max(4).optional(),
});

// Availability schemas
export const RecurringPatternSchema = z.enum(['daily', 'weekly', 'biweekly', 'monthly']);

export const RecurringSchema = z.object({
  pattern: RecurringPatternSchema,
  daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
  endDate: z.string().datetime().optional(),
});

export const VisibilityTypeSchema = z.enum(['all', 'groups', 'specific']);

export const VisibilitySchema = z.object({
  type: VisibilityTypeSchema,
  groupIds: z.array(z.string().uuid()).optional(),
  userIds: z.array(z.string().uuid()).optional(),
});

export const AvailabilityWindowSchema = z.object({
  userId: z.string().uuid(),
  windowId: z.string().uuid(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  recurring: RecurringSchema.optional(),
  visibleTo: VisibilitySchema,
  preferredActivities: z.array(z.string().uuid()).optional(),
  notes: z.string().max(500).optional(),
  createdAt: z.string().datetime(),
});

export const CreateAvailabilitySchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  recurring: RecurringSchema.optional(),
  visibleTo: VisibilitySchema,
  preferredActivities: z.array(z.string().uuid()).optional(),
  notes: z.string().max(500).optional(),
});

export const UpdateAvailabilitySchema = z.object({
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  recurring: RecurringSchema.nullable().optional(),
  visibleTo: VisibilitySchema.optional(),
  preferredActivities: z.array(z.string().uuid()).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

// Event schemas
export const InviteeStatusSchema = z.enum(['pending', 'accepted', 'declined', 'maybe']);
export const EventStatusSchema = z.enum(['draft', 'sent', 'confirmed', 'cancelled']);

export const CounterProposalSchema = z.object({
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  location: z.string().max(200).optional(),
  activityId: z.string().uuid().optional(),
  message: z.string().max(500).optional(),
});

export const EventInviteeSchema = z.object({
  userId: z.string().uuid(),
  status: InviteeStatusSchema,
  respondedAt: z.string().datetime().optional(),
  counterProposal: CounterProposalSchema.optional(),
});

export const EventSchema = z.object({
  eventId: z.string().uuid(),
  hostId: z.string().uuid(),
  title: z.string().min(1).max(100),
  activityId: z.string().uuid().optional(),
  emoji: z.string().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  location: z.string().max(200).optional(),
  notes: z.string().max(500).optional(),
  invitees: z.array(EventInviteeSchema),
  showInviteList: z.boolean().default(true),
  status: EventStatusSchema,
  calendarEventId: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CreateEventSchema = z.object({
  title: z.string().min(1).max(100),
  activityId: z.string().uuid().optional(),
  emoji: z.string().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  location: z.string().max(200).optional(),
  notes: z.string().max(500).optional(),
  inviteeIds: z.array(z.string().uuid()),
  showInviteList: z.boolean().default(true),
});

export const UpdateEventSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  activityId: z.string().uuid().nullable().optional(),
  emoji: z.string().nullable().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  location: z.string().max(200).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  showInviteList: z.boolean().optional(),
});

export const EventResponseSchema = z.object({
  status: InviteeStatusSchema,
  counterProposal: CounterProposalSchema.optional(),
});

// Pending invite schemas
export const PendingInviteSchema = z.object({
  phoneNumber: PhoneNumberSchema,
  eventId: z.string().uuid(),
  invitedBy: z.string().uuid(),
  createdAt: z.string().datetime(),
  smsStatus: z.enum(['pending', 'sent', 'failed']),
});

// Auth schemas
export const RequestCodeSchema = z.object({
  phoneNumber: PhoneNumberSchema,
});

export const VerifyCodeSchema = z.object({
  phoneNumber: PhoneNumberSchema,
  code: z.string().length(6).regex(/^\d{6}$/, 'Code must be 6 digits'),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const RegisterPushTokenSchema = z.object({
  pushToken: z.string().min(1),
});

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

export type PendingInvite = z.infer<typeof PendingInviteSchema>;

export type RequestCode = z.infer<typeof RequestCodeSchema>;
export type VerifyCode = z.infer<typeof VerifyCodeSchema>;
export type RefreshToken = z.infer<typeof RefreshTokenSchema>;
export type RegisterPushToken = z.infer<typeof RegisterPushTokenSchema>;

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
  isNewUser: boolean;
}

// ============================================
// DynamoDB Record Types (with GSI attributes)
// ============================================

export interface UserRecord extends User {
  pk: string;  // USER#<userId>
  sk: string;  // PROFILE
  gsi1pk: string;  // PHONE#<phoneNumber>
  gsi1sk: string;  // USER
}

export interface FriendshipRecord extends Friendship {
  pk: string;  // USER#<userId>
  sk: string;  // FRIEND#<friendId>
}

export interface GroupRecord extends Group {
  pk: string;  // GROUP#<groupId>
  sk: string;  // METADATA
  gsi1pk: string;  // USER#<ownerId>
  gsi1sk: string;  // GROUP#<groupId>
}

export interface ActivityRecord extends Activity {
  pk: string;  // ACTIVITY#<activityId>
  sk: string;  // METADATA
  gsi1pk: string;  // USER#<userId> or SYSTEM
  gsi1sk: string;  // ACTIVITY#<activityId>
}

export interface AvailabilityRecord extends AvailabilityWindow {
  pk: string;  // USER#<userId>
  sk: string;  // AVAILABILITY#<windowId>
}

export interface EventRecord extends Omit<Event, 'invitees'> {
  pk: string;  // EVENT#<eventId>
  sk: string;  // METADATA
  gsi1pk: string;  // USER#<hostId>
  gsi1sk: string;  // EVENT#<startTime>#<eventId>
  invitees: EventInvitee[];
}

export interface EventInviteeRecord {
  pk: string;  // EVENT#<eventId>
  sk: string;  // INVITEE#<userId>
  gsi1pk: string;  // USER#<userId>
  gsi1sk: string;  // INVITE#<status>#<startTime>#<eventId>
  eventId: string;
  userId: string;
  status: InviteeStatus;
  respondedAt?: string;
  counterProposal?: CounterProposal;
}

export interface PendingInviteRecord extends PendingInvite {
  pk: string;  // PENDING#<phoneNumber>
  sk: string;  // EVENT#<eventId>
}

export interface VerificationCodeRecord {
  pk: string;  // VERIFY#<phoneNumber>
  sk: string;  // CODE
  code: string;
  expiresAt: number;  // TTL
  attempts: number;
  createdAt: string;
}
