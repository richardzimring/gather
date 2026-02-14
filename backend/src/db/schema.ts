import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  pgEnum,
  integer,
  primaryKey,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================
// Enums
// ============================================

export const friendshipStatusEnum = pgEnum('friendship_status', [
  'pending',
  'accepted',
  'blocked',
]);

export const inviteeStatusEnum = pgEnum('invitee_status', [
  'pending',
  'accepted',
  'declined',
  'maybe',
]);

export const eventStatusEnum = pgEnum('event_status', [
  'draft',
  'sent',
  'confirmed',
  'cancelled',
]);

export const recurringPatternEnum = pgEnum('recurring_pattern', [
  'daily',
  'weekly',
  'biweekly',
  'monthly',
]);

export const calendarProviderEnum = pgEnum('calendar_provider', [
  'apple',
  'google',
  'outlook',
]);

// ============================================
// Users Table
// ============================================

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    appleUserId: varchar('apple_user_id', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    firstName: varchar('first_name', { length: 50 }).notNull(),
    lastName: varchar('last_name', { length: 50 }).notNull(),
    avatarUrl: text('avatar_url'),
    inviteCode: varchar('invite_code', { length: 8 }),
    calendarSyncEnabled: boolean('calendar_sync_enabled').notNull().default(false),
    pushToken: text('push_token'),
    timezone: varchar('timezone', { length: 100 }).notNull().default('America/New_York'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('users_apple_user_id_idx').on(table.appleUserId),
    uniqueIndex('users_invite_code_idx').on(table.inviteCode),
    index('users_email_idx').on(table.email),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  friendshipsAsUser: many(friendships, { relationName: 'userFriendships' }),
  friendshipsAsFriend: many(friendships, { relationName: 'friendFriendships' }),
  ownedGroups: many(groups),
  groupMemberships: many(groupMembers),
  activities: many(activities),
  blockedWindows: many(blockedWindows),
  hostedEvents: many(events),
  eventInvitations: many(eventInvitees),
  calendarConnections: many(calendarConnections),
}));

// ============================================
// Friendships Table
// ============================================

export const friendships = pgTable(
  'friendships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    friendId: uuid('friend_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: friendshipStatusEnum('status').notNull().default('pending'),
    initiatedBy: uuid('initiated_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('friendships_user_friend_idx').on(table.userId, table.friendId),
    index('friendships_friend_id_idx').on(table.friendId),
    index('friendships_status_idx').on(table.status),
  ],
);

export const friendshipsRelations = relations(friendships, ({ one }) => ({
  user: one(users, {
    fields: [friendships.userId],
    references: [users.id],
    relationName: 'userFriendships',
  }),
  friend: one(users, {
    fields: [friendships.friendId],
    references: [users.id],
    relationName: 'friendFriendships',
  }),
  initiator: one(users, {
    fields: [friendships.initiatedBy],
    references: [users.id],
  }),
}));

// ============================================
// Groups Table
// ============================================

export const groups = pgTable(
  'groups',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 50 }).notNull(),
    emoji: varchar('emoji', { length: 10 }),
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('groups_owner_id_idx').on(table.ownerId),
  ],
);

export const groupsRelations = relations(groups, ({ one, many }) => ({
  owner: one(users, {
    fields: [groups.ownerId],
    references: [users.id],
  }),
  members: many(groupMembers),
}));

// ============================================
// Group Members Junction Table
// ============================================

export const groupMembers = pgTable(
  'group_members',
  {
    groupId: uuid('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.groupId, table.userId] }),
    index('group_members_user_id_idx').on(table.userId),
  ],
);

export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
  group: one(groups, {
    fields: [groupMembers.groupId],
    references: [groups.id],
  }),
  user: one(users, {
    fields: [groupMembers.userId],
    references: [users.id],
  }),
}));

// ============================================
// Activities Table
// ============================================

export const activities = pgTable(
  'activities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 50 }).notNull(),
    emoji: varchar('emoji', { length: 10 }).notNull(),
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('activities_user_id_idx').on(table.userId),
    index('activities_is_default_idx').on(table.isDefault),
  ],
);

export const activitiesRelations = relations(activities, ({ one, many }) => ({
  user: one(users, {
    fields: [activities.userId],
    references: [users.id],
  }),
  events: many(events),
}));

// ============================================
// Blocked Windows Table (times when user is NOT available)
// ============================================

export const blockedWindows = pgTable(
  'blocked_windows',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    startTime: timestamp('start_time', { withTimezone: true }).notNull(),
    endTime: timestamp('end_time', { withTimezone: true }).notNull(),
    // Recurring fields
    recurringPattern: recurringPatternEnum('recurring_pattern'),
    recurringDaysOfWeek: integer('recurring_days_of_week').array(),
    recurringEndDate: timestamp('recurring_end_date', { withTimezone: true }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('blocked_windows_user_id_idx').on(table.userId),
    index('blocked_windows_start_time_idx').on(table.startTime),
  ],
);

export const blockedWindowsRelations = relations(blockedWindows, ({ one }) => ({
  user: one(users, {
    fields: [blockedWindows.userId],
    references: [users.id],
  }),
}));

// ============================================
// Events Table
// ============================================

export const events = pgTable(
  'events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    hostId: uuid('host_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 100 }).notNull(),
    activityId: uuid('activity_id').references(() => activities.id, { onDelete: 'set null' }),
    emoji: varchar('emoji', { length: 10 }),
    startTime: timestamp('start_time', { withTimezone: true }).notNull(),
    endTime: timestamp('end_time', { withTimezone: true }).notNull(),
    location: varchar('location', { length: 200 }),
    locationPlaceId: varchar('location_place_id', { length: 255 }),
    locationAddress: text('location_address'),
    latitude: varchar('latitude', { length: 50 }),
    longitude: varchar('longitude', { length: 50 }),
    notes: text('notes'),
    showInviteList: boolean('show_invite_list').notNull().default(true),
    status: eventStatusEnum('status').notNull().default('sent'),
    // Recurring event fields
    isRecurring: boolean('is_recurring').notNull().default(false),
    recurringPattern: recurringPatternEnum('event_recurring_pattern'),
    recurringDaysOfWeek: integer('event_recurring_days_of_week').array(),
    recurringEndDate: timestamp('event_recurring_end_date', { withTimezone: true }),
    calendarEventId: varchar('calendar_event_id', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('events_host_id_idx').on(table.hostId),
    index('events_start_time_idx').on(table.startTime),
    index('events_status_idx').on(table.status),
  ],
);

export const eventsRelations = relations(events, ({ one, many }) => ({
  host: one(users, {
    fields: [events.hostId],
    references: [users.id],
  }),
  activity: one(activities, {
    fields: [events.activityId],
    references: [activities.id],
  }),
  invitees: many(eventInvitees),
}));

// ============================================
// Event Invitees Table
// ============================================

export const eventInvitees = pgTable(
  'event_invitees',
  {
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: inviteeStatusEnum('status').notNull().default('pending'),
    respondedAt: timestamp('responded_at', { withTimezone: true }),
    // Counter proposal fields
    counterProposalStartTime: timestamp('counter_proposal_start_time', { withTimezone: true }),
    counterProposalEndTime: timestamp('counter_proposal_end_time', { withTimezone: true }),
    counterProposalLocation: varchar('counter_proposal_location', { length: 200 }),
    counterProposalActivityId: uuid('counter_proposal_activity_id').references(() => activities.id, {
      onDelete: 'set null',
    }),
    counterProposalMessage: text('counter_proposal_message'),
  },
  (table) => [
    primaryKey({ columns: [table.eventId, table.userId] }),
    index('event_invitees_user_id_idx').on(table.userId),
    index('event_invitees_status_idx').on(table.status),
  ],
);

export const eventInviteesRelations = relations(eventInvitees, ({ one }) => ({
  event: one(events, {
    fields: [eventInvitees.eventId],
    references: [events.id],
  }),
  user: one(users, {
    fields: [eventInvitees.userId],
    references: [users.id],
  }),
  counterProposalActivity: one(activities, {
    fields: [eventInvitees.counterProposalActivityId],
    references: [activities.id],
  }),
}));

// ============================================
// Locations Table (for saved places)
// ============================================

export const locations = pgTable(
  'locations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    placeId: varchar('place_id', { length: 255 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    address: text('address'),
    latitude: varchar('latitude', { length: 50 }),
    longitude: varchar('longitude', { length: 50 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('locations_place_id_idx').on(table.placeId),
  ],
);

// ============================================
// Calendar Connections Table
// ============================================

export const calendarConnections = pgTable(
  'calendar_connections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: calendarProviderEnum('provider').notNull(),
    externalCalendarId: varchar('external_calendar_id', { length: 255 }).notNull(),
    calendarName: varchar('calendar_name', { length: 255 }).notNull(),
    color: varchar('color', { length: 20 }),
    importEnabled: boolean('import_enabled').notNull().default(true),
    exportEnabled: boolean('export_enabled').notNull().default(false),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
    lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('calendar_connections_user_id_idx').on(table.userId),
    uniqueIndex('calendar_connections_user_provider_calendar_idx').on(
      table.userId,
      table.provider,
      table.externalCalendarId
    ),
  ],
);

export const calendarConnectionsRelations = relations(calendarConnections, ({ one, many }) => ({
  user: one(users, {
    fields: [calendarConnections.userId],
    references: [users.id],
  }),
  cachedEvents: many(calendarEventsCache),
}));

// ============================================
// Calendar Events Cache Table
// ============================================

export const calendarEventsCache = pgTable(
  'calendar_events_cache',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    connectionId: uuid('connection_id')
      .notNull()
      .references(() => calendarConnections.id, { onDelete: 'cascade' }),
    externalEventId: varchar('external_event_id', { length: 255 }).notNull(),
    startTime: timestamp('start_time', { withTimezone: true }).notNull(),
    endTime: timestamp('end_time', { withTimezone: true }).notNull(),
    isBusy: boolean('is_busy').notNull().default(true),
    lastFetchedAt: timestamp('last_fetched_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('calendar_events_cache_connection_id_idx').on(table.connectionId),
    index('calendar_events_cache_start_time_idx').on(table.startTime),
    uniqueIndex('calendar_events_cache_connection_event_idx').on(
      table.connectionId,
      table.externalEventId
    ),
  ],
);

export const calendarEventsCacheRelations = relations(calendarEventsCache, ({ one }) => ({
  connection: one(calendarConnections, {
    fields: [calendarEventsCache.connectionId],
    references: [calendarConnections.id],
  }),
}));

// ============================================
// Emoji Cache Table
// ============================================

export const emojiCache = pgTable(
  'emoji_cache',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    text: text('text').notNull(),
    emoji: text('emoji').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('emoji_cache_text_idx').on(table.text)],
);

// ============================================
// Type Exports
// ============================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Friendship = typeof friendships.$inferSelect;
export type NewFriendship = typeof friendships.$inferInsert;

export type Group = typeof groups.$inferSelect;
export type NewGroup = typeof groups.$inferInsert;

export type GroupMember = typeof groupMembers.$inferSelect;
export type NewGroupMember = typeof groupMembers.$inferInsert;

export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;

export type BlockedWindow = typeof blockedWindows.$inferSelect;
export type NewBlockedWindow = typeof blockedWindows.$inferInsert;

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;

export type EventInvitee = typeof eventInvitees.$inferSelect;
export type NewEventInvitee = typeof eventInvitees.$inferInsert;

export type CalendarConnection = typeof calendarConnections.$inferSelect;
export type NewCalendarConnection = typeof calendarConnections.$inferInsert;

export type CalendarEventCache = typeof calendarEventsCache.$inferSelect;
export type NewCalendarEventCache = typeof calendarEventsCache.$inferInsert;

export type Location = typeof locations.$inferSelect;
export type NewLocation = typeof locations.$inferInsert;

export type EmojiCache = typeof emojiCache.$inferSelect;
export type NewEmojiCache = typeof emojiCache.$inferInsert;
