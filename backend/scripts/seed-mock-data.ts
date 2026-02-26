#!/usr/bin/env tsx

/**
 * Script to create comprehensive mock data for testing
 *
 * Usage:
 *   npm run script:seed
 *
 * This script:
 * 1. Clears all data except your user
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
  events,
  eventInvitees,
  blockedWindows,
} from '../src/db';
import { DEFAULT_GROUPS, FRIEND_CODE_LENGTH } from '../src/constants';
import { eq, and, inArray, or } from 'drizzle-orm';
import {
  sendFriendRequest,
  acceptFriendRequest,
} from '../src/services/friends';
import { createGroup } from '../src/services/groups';
import { createEvent, respondToEvent } from '../src/services/events';

// Your Apple User ID - will be preserved during cleanup
const MY_APPLE_USER_ID = process.env.MY_APPLE_USER_ID as string;

if (!MY_APPLE_USER_ID) {
  console.error('❌ Error: MY_APPLE_USER_ID environment variable is not set');
  process.exit(1);
}

const generateFriendCode = (): string => {
  const bytes = crypto.randomBytes(FRIEND_CODE_LENGTH);
  return bytes.toString('base64url').slice(0, FRIEND_CODE_LENGTH).toUpperCase();
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
  const myUser = await db
    .select()
    .from(users)
    .where(eq(users.appleUserId, MY_APPLE_USER_ID))
    .limit(1);
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
    const myGroups = await db
      .select({ id: groups.id })
      .from(groups)
      .where(eq(groups.ownerId, myUserId));
    const myGroupIds = myGroups.map((g) => g.id);
    if (myGroupIds.length > 0) {
      await db
        .delete(groupMembers)
        .where(inArray(groupMembers.groupId, myGroupIds));
    }
  }

  // Delete non-default groups for my user
  if (myUserId) {
    await db
      .delete(groups)
      .where(and(eq(groups.ownerId, myUserId), eq(groups.isDefault, false)));
  }

  // Delete all friendships involving my user
  if (myUserId) {
    await db
      .delete(friendships)
      .where(
        or(
          eq(friendships.userId, myUserId),
          eq(friendships.friendId, myUserId),
        ),
      );
  }

  // Delete mock users (this cascades to their friendships, groups, etc.)
  if (mockUserIds.length > 0) {
    await db.delete(users).where(inArray(users.id, mockUserIds));
  }

  // Delete blocked windows for my user
  if (myUserId) {
    await db.delete(blockedWindows).where(eq(blockedWindows.userId, myUserId));
  }

  console.log('✅ Cleanup complete');
}

// ============================================
// Seed Functions
// ============================================

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
        friendCode: generateFriendCode(),
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

async function createFriendships(
  myUserId: string,
  userMap: Map<string, string>,
): Promise<void> {
  console.log('🤝 Creating friendships...');

  // Friends I have accepted (mutual friendship)
  // Simulate: I send request, they accept (so notifications are sent)
  const acceptedFriends = ['Alice', 'Bob', 'Charlie', 'Diana'];
  for (const name of acceptedFriends) {
    const friendId = userMap.get(name);
    if (!friendId) continue;

    // I send the friend request
    await sendFriendRequest(myUserId, friendId);
    // They accept it (this will send me a notification)
    await acceptFriendRequest(friendId, myUserId);
    console.log(`  ✅ Accepted friendship with ${name}`);
  }

  // Pending friend requests TO me (they initiated, I haven't responded)
  // This will send me notifications
  const pendingFromOthers = ['Ethan', 'Fiona'];
  for (const name of pendingFromOthers) {
    const friendId = userMap.get(name);
    if (!friendId) continue;

    // They send me a friend request (I'll get a notification)
    await sendFriendRequest(friendId, myUserId);
    console.log(`  ⏳ Pending request from ${name}`);
  }
}

async function createGroups(
  myUserId: string,
  userMap: Map<string, string>,
): Promise<Map<string, string>> {
  console.log('👥 Creating groups...');

  const groupMap = new Map<string, string>(); // name -> id

  const groupsData = [
    { name: 'Work Team', emoji: '💼', members: ['Alice', 'Bob'] },
    { name: 'Gym Buddies', emoji: '🏋️', members: ['Charlie', 'Diana'] },
    { name: 'Game Night', emoji: '🎮', members: ['Alice', 'Charlie'] },
  ];

  for (const groupData of groupsData) {
    // Convert member names to IDs
    const memberIds = groupData.members
      .map((name) => userMap.get(name))
      .filter((id): id is string => !!id);

    // Use the service function to create the group
    const newGroup = await createGroup(myUserId, {
      name: groupData.name,
      emoji: groupData.emoji,
      memberIds,
    });

    groupMap.set(groupData.name, newGroup.groupId);
    console.log(`  ✅ Created group: ${groupData.emoji} ${groupData.name}`);
    console.log(`    Added ${memberIds.length} members`);
  }

  return groupMap;
}

async function createEvents(
  myUserId: string,
  userMap: Map<string, string>,
): Promise<void> {
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
  const event1 = await createEvent(myUserId, {
    title: 'Coffee Catch-up',
    emoji: '☕',
    startTime: event1Start.toISOString(),
    endTime: new Date(event1Start.getTime() + 60 * 60 * 1000).toISOString(),
    location: SAMPLE_LOCATIONS.spyhouse.name,
    locationData: {
      name: SAMPLE_LOCATIONS.spyhouse.name,
      placeId: SAMPLE_LOCATIONS.spyhouse.placeId,
      address: SAMPLE_LOCATIONS.spyhouse.address,
      latitude: SAMPLE_LOCATIONS.spyhouse.latitude,
      longitude: SAMPLE_LOCATIONS.spyhouse.longitude,
    },
    notes: 'Looking forward to catching up!',
    inviteeIds: [aliceId, bobId],
    showInviteList: true,
  });

  // Simulate responses (they will send notifications to me as the host)
  await respondToEvent(event1.eventId, aliceId, { status: 'accepted' });
  await respondToEvent(event1.eventId, bobId, { status: 'accepted' });
  console.log('  ✅ Coffee Catch-up (all accepted, has location)');

  // Event 2: Mixed responses (some accepted, some maybe, some declined)
  const event2Start = addDays(5, 18);
  const event2 = await createEvent(myUserId, {
    title: 'Dinner Party',
    emoji: '🍽️',
    startTime: event2Start.toISOString(),
    endTime: new Date(event2Start.getTime() + 3 * 60 * 60 * 1000).toISOString(),
    notes: "Let's celebrate! Location TBD",
    inviteeIds: [aliceId, bobId, charlieId, dianaId],
    showInviteList: true,
  });

  // Mixed responses (will send me notifications)
  await respondToEvent(event2.eventId, aliceId, { status: 'accepted' });
  await respondToEvent(event2.eventId, bobId, { status: 'maybe' });
  await respondToEvent(event2.eventId, charlieId, { status: 'declined' });
  // Diana hasn't responded (stays pending)
  console.log('  ✅ Dinner Party (mixed responses, no location)');

  // Event 3: Counter proposal received
  const event3Start = addDays(7, 15);
  const event3 = await createEvent(myUserId, {
    title: 'Afternoon Drinks',
    emoji: '🍻',
    startTime: event3Start.toISOString(),
    endTime: new Date(event3Start.getTime() + 2 * 60 * 60 * 1000).toISOString(),
    location: SAMPLE_LOCATIONS.milkweed.name,
    locationData: {
      name: SAMPLE_LOCATIONS.milkweed.name,
      placeId: SAMPLE_LOCATIONS.milkweed.placeId,
      address: SAMPLE_LOCATIONS.milkweed.address,
      latitude: SAMPLE_LOCATIONS.milkweed.latitude,
      longitude: SAMPLE_LOCATIONS.milkweed.longitude,
    },
    inviteeIds: [charlieId],
    showInviteList: true,
  });

  // Charlie responds with counter proposal (will send me notification)
  const counterStart = addDays(7, 17); // Suggesting 5pm instead of 3pm
  await respondToEvent(event3.eventId, charlieId, {
    status: 'maybe',
    counterProposal: {
      startTime: counterStart.toISOString(),
      endTime: new Date(
        counterStart.getTime() + 2 * 60 * 60 * 1000,
      ).toISOString(),
      message: 'Can we do 5pm instead? I have a meeting until 4:30.',
    },
  });
  console.log('  ✅ Afternoon Drinks (with counter proposal)');

  // Event 4: All pending (just sent)
  const event4Start = addDays(10, 19);
  await createEvent(myUserId, {
    title: 'Game Night',
    emoji: '🎮',
    startTime: event4Start.toISOString(),
    endTime: new Date(event4Start.getTime() + 4 * 60 * 60 * 1000).toISOString(),
    notes: 'Bring your favorite board games!',
    inviteeIds: [aliceId, charlieId],
    showInviteList: true,
  });
  console.log('  ✅ Game Night (all pending)');

  // ============================================
  // EVENTS I AM INVITED TO
  // ============================================

  // Event 5: Invited by Alice, I haven't responded yet (with location)
  // This will send me a notification
  const event5Start = addDays(3, 9);
  const event5 = await createEvent(aliceId, {
    title: 'Morning Run at the Lake',
    emoji: '🏃',
    startTime: event5Start.toISOString(),
    endTime: new Date(event5Start.getTime() + 60 * 60 * 1000).toISOString(),
    location: SAMPLE_LOCATIONS.lakeCalhoun.name,
    locationData: {
      name: SAMPLE_LOCATIONS.lakeCalhoun.name,
      placeId: SAMPLE_LOCATIONS.lakeCalhoun.placeId,
      address: SAMPLE_LOCATIONS.lakeCalhoun.address,
      latitude: SAMPLE_LOCATIONS.lakeCalhoun.latitude,
      longitude: SAMPLE_LOCATIONS.lakeCalhoun.longitude,
    },
    notes: "Let's do a 5K around the lake!",
    inviteeIds: [myUserId, bobId],
    showInviteList: true,
  });

  // Bob accepts, I stay pending
  await respondToEvent(event5.eventId, bobId, { status: 'accepted' });
  console.log('  ✅ Morning Run (invited, pending my response)');

  // Event 6: Invited by Bob, I accepted (no location)
  // This will send me a notification
  const event6Start = addDays(4, 12);
  const event6 = await createEvent(bobId, {
    title: 'Lunch Meeting',
    emoji: '🥗',
    startTime: event6Start.toISOString(),
    endTime: new Date(event6Start.getTime() + 90 * 60 * 1000).toISOString(),
    notes: 'Quick sync about the project',
    inviteeIds: [myUserId],
    showInviteList: true,
  });

  // I accept (sends Bob a notification)
  await respondToEvent(event6.eventId, myUserId, { status: 'accepted' });
  console.log('  ✅ Lunch Meeting (invited, I accepted)');

  // Event 7: Invited by Charlie, I said maybe with counter proposal
  // This will send me a notification
  const event7Start = addDays(6, 20);
  const event7 = await createEvent(charlieId, {
    title: 'Movie Night',
    emoji: '🎬',
    startTime: event7Start.toISOString(),
    endTime: new Date(event7Start.getTime() + 3 * 60 * 60 * 1000).toISOString(),
    notes: "Let's watch the new Marvel movie",
    inviteeIds: [myUserId],
    showInviteList: true,
  });

  // I respond with counter proposal (sends Charlie a notification)
  const counterStart7 = addDays(6, 19); // Suggesting 7pm instead of 8pm
  await respondToEvent(event7.eventId, myUserId, {
    status: 'maybe',
    counterProposal: {
      startTime: counterStart7.toISOString(),
      endTime: new Date(
        counterStart7.getTime() + 3 * 60 * 60 * 1000,
      ).toISOString(),
      message: 'Could we start at 7pm? I have an early morning the next day.',
    },
  });
  console.log('  ✅ Movie Night (invited, I said maybe with counter)');

  // Event 8: Invited by Diana, I declined
  // This will send me a notification
  const event8Start = addDays(8, 7);
  const event8 = await createEvent(dianaId, {
    title: 'Early Gym Session',
    emoji: '🏋️',
    startTime: event8Start.toISOString(),
    endTime: new Date(event8Start.getTime() + 90 * 60 * 1000).toISOString(),
    location: 'Downtown Fitness Center',
    notes: 'Leg day!',
    inviteeIds: [myUserId],
    showInviteList: true,
  });

  // I decline (sends Diana a notification)
  await respondToEvent(event8.eventId, myUserId, { status: 'declined' });
  console.log('  ✅ Early Gym Session (invited, I declined)');

  // Event 9: Past event - Invited by Alice, I attended (confirmed)
  // For past events, we need to manually set timestamps to avoid notifications
  const event9Start = addDays(-3, 18);
  const [event9Db] = await db
    .insert(events)
    .values({
      hostId: aliceId,
      title: 'Happy Hour',
      emoji: '🍸',
      startTime: event9Start,
      endTime: new Date(event9Start.getTime() + 2 * 60 * 60 * 1000),
      location: 'The Local Bar',
      showInviteList: true,
      status: 'active',
    })
    .returning();

  if (event9Db) {
    await db.insert(eventInvitees).values([
      {
        eventId: event9Db.id,
        userId: myUserId,
        status: 'accepted',
        respondedAt: new Date(event9Start.getTime() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        eventId: event9Db.id,
        userId: bobId,
        status: 'accepted',
        respondedAt: new Date(event9Start.getTime() - 2 * 24 * 60 * 60 * 1000),
      },
    ]);
    console.log('  ✅ Happy Hour (past event, attended)');
  }

  // Event 10: Draft event I'm creating (use direct DB since status is 'draft')
  const event10Start = addDays(14, 11);
  const [event10Db] = await db
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

  if (event10Db) {
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
    console.error(
      '❌ Error: Your user not found. Please sign in to the app first.',
    );
    process.exit(1);
  }
  console.log(`📍 Found your user ID: ${myUserId}\n`);

  // Clean up existing mock data
  await cleanupDatabase(myUserId);
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
  console.log('  - 4 accepted friendships (with notifications)');
  console.log('  - 2 pending friend requests (with notifications)');
  console.log('  - 3 custom groups with members');
  console.log('  - 10 events in various states');
  console.log('    • 4 events you are hosting');
  console.log('    • 5 events you are invited to (with notifications)');
  console.log('    • 1 draft event');
  console.log('    • 1 past event (no notifications)');
  console.log('');
  console.log('📱 Push Notifications:');
  console.log('  If you have push notifications enabled, you should receive:');
  console.log('  - 2 friend request notifications (from Ethan and Fiona)');
  console.log(
    '  - 4 friend accepted notifications (from Alice, Bob, Charlie, Diana)',
  );
  console.log(
    '  - 5 event invitation notifications (from Alice, Bob, Charlie, Diana)',
  );
  console.log('  - 9 event response notifications (as host of your events)');
  console.log('  - 1 counter proposal notification (from Charlie)');
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
