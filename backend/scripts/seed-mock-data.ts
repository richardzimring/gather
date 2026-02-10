#!/usr/bin/env tsx

/**
 * Script to create comprehensive mock data for testing
 *
 * Usage:
 *   npm run script:seed
 *
 * This script:
 * 1. Clears all data except your user and default activities
 * 2. Creates mock users
 * 3. Creates friendships (accepted + pending requests to you)
 * 4. Creates groups with members
 * 5. Creates events in various states (hosted by you and others)
 */

import * as crypto from 'crypto';
import {
  db,
  users,
  friendships,
  groups,
  groupMembers,
  activities,
  events,
  eventInvitees,
  availabilityWindows,
} from '../src/db';
import { DEFAULT_GROUPS, DEFAULT_ACTIVITIES, INVITE_CODE_LENGTH } from '../src/constants';
import { eq, and, inArray, or } from 'drizzle-orm';

// Your Apple User ID - will be preserved during cleanup
const MY_APPLE_USER_ID = process.env.MY_APPLE_USER_ID as string;

if (!MY_APPLE_USER_ID) {
  console.error('❌ Error: MY_APPLE_USER_ID environment variable is not set');
  process.exit(1);
}

const generateInviteCode = (): string => {
  const bytes = crypto.randomBytes(INVITE_CODE_LENGTH);
  return bytes.toString('base64url').slice(0, INVITE_CODE_LENGTH).toUpperCase();
};

// ============================================
// Mock Data Definitions
// ============================================

const MOCK_USERS = [
  {
    appleUserId: 'apple-mock-alice',
    email: 'alice@example.com',
    firstName: 'Alice',
    lastName: 'Johnson',
    timezone: 'America/New_York',
  },
  {
    appleUserId: 'apple-mock-bob',
    email: 'bob@example.com',
    firstName: 'Bob',
    lastName: 'Smith',
    timezone: 'America/Los_Angeles',
  },
  {
    appleUserId: 'apple-mock-charlie',
    email: 'charlie@example.com',
    firstName: 'Charlie',
    lastName: 'Brown',
    timezone: 'America/Chicago',
  },
  {
    appleUserId: 'apple-mock-diana',
    email: 'diana@example.com',
    firstName: 'Diana',
    lastName: 'Prince',
    timezone: 'America/New_York',
  },
  {
    appleUserId: 'apple-mock-ethan',
    email: 'ethan@example.com',
    firstName: 'Ethan',
    lastName: 'Hunt',
    timezone: 'America/Denver',
  },
  {
    appleUserId: 'apple-mock-fiona',
    email: 'fiona@example.com',
    firstName: 'Fiona',
    lastName: 'Green',
    timezone: 'America/Chicago',
  },
];

// Sample locations for events
const SAMPLE_LOCATIONS = {
  spyhouse: {
    name: 'Spyhouse Coffee Roasters | Northeast',
    address: 'Broadway Street Northeast, Minneapolis, MN, USA',
    placeId: 'ChIJAbkBsJkts1IRNj7L1NnbGUg',
    latitude: '44.9988885',
    longitude: '-93.24633',
  },
  lakeCalhoun: {
    name: 'Bde Maka Ska',
    address: 'Minneapolis, MN, USA',
    placeId: 'ChIJZ7E1A5kys1IRlWKH3wZ7A6Q',
    latitude: '44.9489',
    longitude: '-93.3099',
  },
  milkweed: {
    name: 'Milkweed Coffee',
    address: '2205 California St NE, Minneapolis, MN 55418',
    placeId: 'ChIJSQD_9Kkts1IRpBuR8XwqZrw',
    latitude: '45.0012',
    longitude: '-93.2456',
  },
};

// ============================================
// Cleanup Functions
// ============================================

async function getMyUserId(): Promise<string | null> {
  const myUser = await db.select().from(users).where(eq(users.appleUserId, MY_APPLE_USER_ID)).limit(1);
  return myUser[0]?.id ?? null;
}

async function cleanupDatabase(myUserId: string | null): Promise<void> {
  console.log('🧹 Cleaning up database...');

  // Get all mock user IDs to delete
  const mockUserAppleIds = MOCK_USERS.map((u) => u.appleUserId);
  const mockUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.appleUserId, mockUserAppleIds));
  const mockUserIds = mockUsers.map((u) => u.id);

  // Delete events where host is a mock user
  if (mockUserIds.length > 0) {
    await db.delete(events).where(inArray(events.hostId, mockUserIds));
  }

  // Delete events where my user is the host (we'll recreate them)
  if (myUserId) {
    await db.delete(events).where(eq(events.hostId, myUserId));
  }

  // Delete all event invitees for my user (covers events where I'm invited)
  if (myUserId) {
    await db.delete(eventInvitees).where(eq(eventInvitees.userId, myUserId));
  }

  // Delete group members (except default groups)
  if (myUserId) {
    const myGroups = await db.select({ id: groups.id }).from(groups).where(eq(groups.ownerId, myUserId));
    const myGroupIds = myGroups.map((g) => g.id);
    if (myGroupIds.length > 0) {
      await db.delete(groupMembers).where(inArray(groupMembers.groupId, myGroupIds));
    }
  }

  // Delete non-default groups for my user
  if (myUserId) {
    await db.delete(groups).where(and(eq(groups.ownerId, myUserId), eq(groups.isDefault, false)));
  }

  // Delete all friendships involving my user
  if (myUserId) {
    await db.delete(friendships).where(or(eq(friendships.userId, myUserId), eq(friendships.friendId, myUserId)));
  }

  // Delete mock users (this cascades to their friendships, groups, etc.)
  if (mockUserIds.length > 0) {
    await db.delete(users).where(inArray(users.id, mockUserIds));
  }

  // Delete non-default activities for my user (keep defaults)
  if (myUserId) {
    await db.delete(activities).where(and(eq(activities.userId, myUserId), eq(activities.isDefault, false)));
  }

  // Delete availability windows for my user
  if (myUserId) {
    await db.delete(availabilityWindows).where(eq(availabilityWindows.userId, myUserId));
  }

  console.log('✅ Cleanup complete');
}

// ============================================
// Seed Functions
// ============================================

async function ensureDefaultActivities(): Promise<void> {
  const existing = await db.select().from(activities).where(eq(activities.isDefault, true)).limit(1);
  if (existing.length > 0) return;

  console.log('📝 Creating default activities...');
  await db.insert(activities).values(
    DEFAULT_ACTIVITIES.map((a) => ({
      userId: null,
      name: a.name,
      emoji: a.emoji,
      isDefault: true,
    })),
  );
  console.log(`✅ Created ${DEFAULT_ACTIVITIES.length} default activities`);
}

async function createMockUsers(): Promise<Map<string, string>> {
  console.log('👥 Creating mock users...');

  const userMap = new Map<string, string>(); // firstName -> id

  for (const userData of MOCK_USERS) {
    const [newUser] = await db
      .insert(users)
      .values({
        appleUserId: userData.appleUserId,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        timezone: userData.timezone,
        inviteCode: generateInviteCode(),
        calendarSyncEnabled: false,
      })
      .returning();

    if (newUser) {
      userMap.set(userData.firstName, newUser.id);
      console.log(`  ✅ Created: ${userData.firstName} ${userData.lastName}`);

      // Create default groups for this user
      await db.insert(groups).values(
        DEFAULT_GROUPS.map((g) => ({
          ownerId: newUser.id,
          name: g.name,
          emoji: g.emoji,
          isDefault: true,
        })),
      );
    }
  }

  return userMap;
}

async function createFriendships(myUserId: string, userMap: Map<string, string>): Promise<void> {
  console.log('🤝 Creating friendships...');

  const now = new Date();

  // Friends I have accepted (mutual friendship)
  const acceptedFriends = ['Alice', 'Bob', 'Charlie', 'Diana'];
  for (const name of acceptedFriends) {
    const friendId = userMap.get(name);
    if (!friendId) continue;

    await db.insert(friendships).values([
      {
        userId: myUserId,
        friendId: friendId,
        status: 'accepted',
        initiatedBy: myUserId,
        acceptedAt: now,
      },
      {
        userId: friendId,
        friendId: myUserId,
        status: 'accepted',
        initiatedBy: myUserId,
        acceptedAt: now,
      },
    ]);
    console.log(`  ✅ Accepted friendship with ${name}`);
  }

  // Pending friend requests TO me (they initiated, I haven't responded)
  const pendingFromOthers = ['Ethan', 'Fiona'];
  for (const name of pendingFromOthers) {
    const friendId = userMap.get(name);
    if (!friendId) continue;

    await db.insert(friendships).values([
      {
        userId: friendId,
        friendId: myUserId,
        status: 'pending',
        initiatedBy: friendId,
      },
      {
        userId: myUserId,
        friendId: friendId,
        status: 'pending',
        initiatedBy: friendId,
      },
    ]);
    console.log(`  ⏳ Pending request from ${name}`);
  }
}

async function createGroups(myUserId: string, userMap: Map<string, string>): Promise<Map<string, string>> {
  console.log('👥 Creating groups...');

  const groupMap = new Map<string, string>(); // name -> id

  const groupsData = [
    { name: 'Work Team', emoji: '💼', members: ['Alice', 'Bob'] },
    { name: 'Gym Buddies', emoji: '🏋️', members: ['Charlie', 'Diana'] },
    { name: 'Game Night', emoji: '🎮', members: ['Alice', 'Charlie'] },
  ];

  for (const groupData of groupsData) {
    const [newGroup] = await db
      .insert(groups)
      .values({
        ownerId: myUserId,
        name: groupData.name,
        emoji: groupData.emoji,
        isDefault: false,
      })
      .returning();

    if (newGroup) {
      groupMap.set(groupData.name, newGroup.id);
      console.log(`  ✅ Created group: ${groupData.emoji} ${groupData.name}`);

      // Add members to the group
      const memberInserts = groupData.members
        .map((name) => userMap.get(name))
        .filter((id): id is string => !!id)
        .map((userId) => ({
          groupId: newGroup.id,
          userId,
        }));

      if (memberInserts.length > 0) {
        await db.insert(groupMembers).values(memberInserts);
        console.log(`    Added ${memberInserts.length} members`);
      }
    }
  }

  return groupMap;
}

async function createEvents(myUserId: string, userMap: Map<string, string>): Promise<void> {
  console.log('📅 Creating events...');

  // Get user IDs upfront and validate they exist
  const aliceId = userMap.get('Alice');
  const bobId = userMap.get('Bob');
  const charlieId = userMap.get('Charlie');
  const dianaId = userMap.get('Diana');

  if (!aliceId || !bobId || !charlieId || !dianaId) {
    console.error('  ❌ Missing required user IDs');
    return;
  }

  // Get default activities to use
  const defaultActivities = await db.select().from(activities).where(eq(activities.isDefault, true));
  const coffeeActivity = defaultActivities.find((a) => a.name === 'Coffee');
  const dinnerActivity = defaultActivities.find((a) => a.name === 'Dinner');
  const drinksActivity = defaultActivities.find((a) => a.name === 'Drinks');
  const gymActivity = defaultActivities.find((a) => a.name === 'Gym');

  const now = new Date();

  // Helper to create date offsets
  const addDays = (days: number, hour = 14): Date => {
    const date = new Date(now);
    date.setDate(date.getDate() + days);
    date.setHours(hour, 0, 0, 0);
    return date;
  };

  // ============================================
  // EVENTS I AM HOSTING
  // ============================================

  // Event 1: All invitees accepted (with location)
  const event1Start = addDays(2, 10);
  const [event1] = await db
    .insert(events)
    .values({
      hostId: myUserId,
      title: 'Coffee Catch-up',
      activityId: coffeeActivity?.id,
      emoji: '☕',
      startTime: event1Start,
      endTime: new Date(event1Start.getTime() + 60 * 60 * 1000),
      location: SAMPLE_LOCATIONS.spyhouse.name,
      locationPlaceId: SAMPLE_LOCATIONS.spyhouse.placeId,
      locationAddress: SAMPLE_LOCATIONS.spyhouse.address,
      latitude: SAMPLE_LOCATIONS.spyhouse.latitude,
      longitude: SAMPLE_LOCATIONS.spyhouse.longitude,
      notes: 'Looking forward to catching up!',
      showInviteList: true,
      status: 'confirmed',
    })
    .returning();

  if (event1) {
    await db.insert(eventInvitees).values([
      { eventId: event1.id, userId: aliceId, status: 'accepted', respondedAt: now },
      { eventId: event1.id, userId: bobId, status: 'accepted', respondedAt: now },
    ]);
    console.log('  ✅ Coffee Catch-up (all accepted, has location)');
  }

  // Event 2: Mixed responses (some accepted, some maybe, some declined)
  const event2Start = addDays(5, 18);
  const [event2] = await db
    .insert(events)
    .values({
      hostId: myUserId,
      title: 'Dinner Party',
      activityId: dinnerActivity?.id,
      emoji: '🍽️',
      startTime: event2Start,
      endTime: new Date(event2Start.getTime() + 3 * 60 * 60 * 1000),
      location: null, // No location
      notes: "Let's celebrate! Location TBD",
      showInviteList: true,
      status: 'sent',
    })
    .returning();

  if (event2) {
    await db.insert(eventInvitees).values([
      { eventId: event2.id, userId: aliceId, status: 'accepted', respondedAt: now },
      { eventId: event2.id, userId: bobId, status: 'maybe', respondedAt: now },
      { eventId: event2.id, userId: charlieId, status: 'declined', respondedAt: now },
      { eventId: event2.id, userId: dianaId, status: 'pending' }, // Hasn't responded
    ]);
    console.log('  ✅ Dinner Party (mixed responses, no location)');
  }

  // Event 3: Counter proposal received
  const event3Start = addDays(7, 15);
  const [event3] = await db
    .insert(events)
    .values({
      hostId: myUserId,
      title: 'Afternoon Drinks',
      activityId: drinksActivity?.id,
      emoji: '🍻',
      startTime: event3Start,
      endTime: new Date(event3Start.getTime() + 2 * 60 * 60 * 1000),
      location: SAMPLE_LOCATIONS.milkweed.name,
      locationPlaceId: SAMPLE_LOCATIONS.milkweed.placeId,
      locationAddress: SAMPLE_LOCATIONS.milkweed.address,
      latitude: SAMPLE_LOCATIONS.milkweed.latitude,
      longitude: SAMPLE_LOCATIONS.milkweed.longitude,
      showInviteList: true,
      status: 'sent',
    })
    .returning();

  if (event3) {
    const counterStart = addDays(7, 17); // Suggesting 5pm instead of 3pm
    await db.insert(eventInvitees).values([
      {
        eventId: event3.id,
        userId: charlieId,
        status: 'maybe',
        respondedAt: now,
        counterProposalStartTime: counterStart,
        counterProposalEndTime: new Date(counterStart.getTime() + 2 * 60 * 60 * 1000),
        counterProposalMessage: 'Can we do 5pm instead? I have a meeting until 4:30.',
      },
    ]);
    console.log('  ✅ Afternoon Drinks (with counter proposal)');
  }

  // Event 4: All pending (just sent)
  const event4Start = addDays(10, 19);
  const [event4] = await db
    .insert(events)
    .values({
      hostId: myUserId,
      title: 'Game Night',
      emoji: '🎮',
      startTime: event4Start,
      endTime: new Date(event4Start.getTime() + 4 * 60 * 60 * 1000),
      notes: 'Bring your favorite board games!',
      showInviteList: true,
      status: 'sent',
    })
    .returning();

  if (event4) {
    await db.insert(eventInvitees).values([
      { eventId: event4.id, userId: aliceId, status: 'pending' },
      { eventId: event4.id, userId: charlieId, status: 'pending' },
    ]);
    console.log('  ✅ Game Night (all pending)');
  }

  // ============================================
  // EVENTS I AM INVITED TO
  // ============================================

  // Event 5: Invited by Alice, I haven't responded yet (with location)
  const event5Start = addDays(3, 9);
  const [event5] = await db
    .insert(events)
    .values({
      hostId: aliceId,
      title: 'Morning Run at the Lake',
      emoji: '🏃',
      startTime: event5Start,
      endTime: new Date(event5Start.getTime() + 60 * 60 * 1000),
      location: SAMPLE_LOCATIONS.lakeCalhoun.name,
      locationPlaceId: SAMPLE_LOCATIONS.lakeCalhoun.placeId,
      locationAddress: SAMPLE_LOCATIONS.lakeCalhoun.address,
      latitude: SAMPLE_LOCATIONS.lakeCalhoun.latitude,
      longitude: SAMPLE_LOCATIONS.lakeCalhoun.longitude,
      notes: "Let's do a 5K around the lake!",
      showInviteList: true,
      status: 'sent',
    })
    .returning();

  if (event5) {
    await db.insert(eventInvitees).values([
      { eventId: event5.id, userId: myUserId, status: 'pending' }, // I haven't responded
      { eventId: event5.id, userId: bobId, status: 'accepted', respondedAt: now },
    ]);
    console.log('  ✅ Morning Run (invited, pending my response)');
  }

  // Event 6: Invited by Bob, I accepted (no location)
  const event6Start = addDays(4, 12);
  const [event6] = await db
    .insert(events)
    .values({
      hostId: bobId,
      title: 'Lunch Meeting',
      activityId: dinnerActivity?.id,
      emoji: '🥗',
      startTime: event6Start,
      endTime: new Date(event6Start.getTime() + 90 * 60 * 1000),
      notes: 'Quick sync about the project',
      showInviteList: true,
      status: 'confirmed',
    })
    .returning();

  if (event6) {
    await db.insert(eventInvitees).values([
      { eventId: event6.id, userId: myUserId, status: 'accepted', respondedAt: now },
    ]);
    console.log('  ✅ Lunch Meeting (invited, I accepted)');
  }

  // Event 7: Invited by Charlie, I said maybe with counter proposal
  const event7Start = addDays(6, 20);
  const [event7] = await db
    .insert(events)
    .values({
      hostId: charlieId,
      title: 'Movie Night',
      emoji: '🎬',
      startTime: event7Start,
      endTime: new Date(event7Start.getTime() + 3 * 60 * 60 * 1000),
      notes: "Let's watch the new Marvel movie",
      showInviteList: true,
      status: 'sent',
    })
    .returning();

  if (event7) {
    const counterStart = addDays(6, 19); // Suggesting 7pm instead of 8pm
    await db.insert(eventInvitees).values([
      {
        eventId: event7.id,
        userId: myUserId,
        status: 'maybe',
        respondedAt: now,
        counterProposalStartTime: counterStart,
        counterProposalEndTime: new Date(counterStart.getTime() + 3 * 60 * 60 * 1000),
        counterProposalMessage: 'Could we start at 7pm? I have an early morning the next day.',
      },
    ]);
    console.log('  ✅ Movie Night (invited, I said maybe with counter)');
  }

  // Event 8: Invited by Diana, I declined
  const event8Start = addDays(8, 7);
  const [event8] = await db
    .insert(events)
    .values({
      hostId: dianaId,
      title: 'Early Gym Session',
      activityId: gymActivity?.id,
      emoji: '🏋️',
      startTime: event8Start,
      endTime: new Date(event8Start.getTime() + 90 * 60 * 1000),
      location: 'Downtown Fitness Center',
      notes: 'Leg day!',
      showInviteList: true,
      status: 'sent',
    })
    .returning();

  if (event8) {
    await db.insert(eventInvitees).values([
      { eventId: event8.id, userId: myUserId, status: 'declined', respondedAt: now },
    ]);
    console.log('  ✅ Early Gym Session (invited, I declined)');
  }

  // Event 9: Past event - Invited by Alice, I attended (confirmed)
  const event9Start = addDays(-3, 18);
  const [event9] = await db
    .insert(events)
    .values({
      hostId: aliceId,
      title: 'Happy Hour',
      activityId: drinksActivity?.id,
      emoji: '🍸',
      startTime: event9Start,
      endTime: new Date(event9Start.getTime() + 2 * 60 * 60 * 1000),
      location: 'The Local Bar',
      showInviteList: true,
      status: 'confirmed',
    })
    .returning();

  if (event9) {
    await db.insert(eventInvitees).values([
      { eventId: event9.id, userId: myUserId, status: 'accepted', respondedAt: new Date(event9Start.getTime() - 2 * 24 * 60 * 60 * 1000) },
      { eventId: event9.id, userId: bobId, status: 'accepted', respondedAt: new Date(event9Start.getTime() - 2 * 24 * 60 * 60 * 1000) },
    ]);
    console.log('  ✅ Happy Hour (past event, attended)');
  }

  // Event 10: Draft event I'm creating
  const event10Start = addDays(14, 11);
  const [event10] = await db
    .insert(events)
    .values({
      hostId: myUserId,
      title: 'Weekend Brunch',
      emoji: '🥐',
      startTime: event10Start,
      endTime: new Date(event10Start.getTime() + 2 * 60 * 60 * 1000),
      notes: 'Planning a brunch meetup',
      showInviteList: true,
      status: 'draft',
    })
    .returning();

  if (event10) {
    console.log('  ✅ Weekend Brunch (draft, no invitees yet)');
  }
}

// ============================================
// Main
// ============================================

async function main() {
  console.log('🌱 Starting comprehensive seed...\n');

  // Get my user ID
  const myUserId = await getMyUserId();
  if (!myUserId) {
    console.error('❌ Error: Your user not found. Please sign in to the app first.');
    process.exit(1);
  }
  console.log(`📍 Found your user ID: ${myUserId}\n`);

  // Clean up existing mock data
  await cleanupDatabase(myUserId);
  console.log('');

  // Ensure default activities exist
  await ensureDefaultActivities();
  console.log('');

  // Create mock users
  const userMap = await createMockUsers();
  console.log('');

  // Create friendships
  await createFriendships(myUserId, userMap);
  console.log('');

  // Create groups
  await createGroups(myUserId, userMap);
  console.log('');

  // Create events
  await createEvents(myUserId, userMap);
  console.log('');

  console.log('🎉 Seed complete!\n');
  console.log('Summary:');
  console.log(`  - ${MOCK_USERS.length} mock users created`);
  console.log('  - 4 accepted friendships');
  console.log('  - 2 pending friend requests');
  console.log('  - 3 custom groups with members');
  console.log('  - 10 events in various states');
  console.log('    • 4 events you are hosting');
  console.log('    • 5 events you are invited to');
  console.log('    • 1 draft event');
}

main()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
