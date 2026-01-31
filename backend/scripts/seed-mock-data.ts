#!/usr/bin/env tsx

/**
 * Script to create mock data for testing
 *
 * Usage:
 *   npm run script:seed users
 *   npm run script:seed events
 *   npm run script:seed groups
 *   npm run script:seed activities
 *   npm run script:seed all
 */

import * as crypto from 'crypto';
import { db, users, friendships, groups, activities, events, eventInvitees } from '../src/db';
import { DEFAULT_GROUPS, DEFAULT_ACTIVITIES, INVITE_CODE_LENGTH } from '../src/constants';
import { eq } from 'drizzle-orm';

type SeedModel = 'users' | 'events' | 'groups' | 'activities' | 'friendships' | 'all';

// Mock data generators
const MY_APPLE_USER_ID = process.env.MY_APPLE_USER_ID as string;

const generateInviteCode = (): string => {
  const bytes = crypto.randomBytes(INVITE_CODE_LENGTH);
  return bytes.toString('base64url').slice(0, INVITE_CODE_LENGTH).toUpperCase();
};

interface MockUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

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

async function seedUsers(): Promise<MockUser[]> {
  console.log('👥 Creating mock users...');

  const usersData = [
    {
      appleUserId: 'apple-mock-001',
      email: 'alice@example.com',
      firstName: 'Alice',
      lastName: 'Johnson',
      timezone: 'America/New_York',
    },
    {
      appleUserId: 'apple-mock-002',
      email: 'bob@example.com',
      firstName: 'Bob',
      lastName: 'Smith',
      timezone: 'America/Los_Angeles',
    },
    {
      appleUserId: 'apple-mock-003',
      email: 'charlie@example.com',
      firstName: 'Charlie',
      lastName: 'Brown',
      timezone: 'America/Chicago',
    },
    {
      appleUserId: 'apple-mock-004',
      email: 'diana@example.com',
      firstName: 'Diana',
      lastName: 'Prince',
      timezone: 'America/New_York',
    },
  ];

  const createdUsers: MockUser[] = [];
  for (const userData of usersData) {
    // Check if user already exists
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.appleUserId, userData.appleUserId))
      .limit(1);

    if (existing.length > 0 && existing[0]) {
      console.log(`⏭️  User already exists: ${userData.firstName} ${userData.lastName}`);
      createdUsers.push({
        id: existing[0].id,
        firstName: existing[0].firstName,
        lastName: existing[0].lastName,
        email: existing[0].email,
      });
      continue;
    }

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
      createdUsers.push({
        id: newUser.id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
      });
      console.log(`✅ Created user: ${userData.firstName} ${userData.lastName} (${userData.email})`);

      // Create default groups for this user
      await db.insert(groups).values(
        DEFAULT_GROUPS.map((g) => ({
          ownerId: newUser.id,
          name: g.name,
          emoji: g.emoji,
          isDefault: true,
        })),
      );

      // Send friend request to MY_USER_ID if it exists
      const myUser = await db.select().from(users).where(eq(users.appleUserId, MY_APPLE_USER_ID)).limit(1);
      const myUserId = myUser[0]?.id;
      if (myUser.length > 0 && myUserId) {
        await db.insert(friendships).values([
          {
            userId: newUser.id,
            friendId: myUserId,
            status: 'pending',
            initiatedBy: newUser.id,
          },
          {
            userId: myUserId,
            friendId: newUser.id,
            status: 'pending',
            initiatedBy: newUser.id,
          },
        ]);
        console.log(`  📤 Sent friend request to user ${myUserId}`);
      }
    }
  }

  return createdUsers;
}

async function seedGroups(userId: string): Promise<{ id: string; name: string }[]> {
  console.log('👥 Creating mock groups...');

  const groupsData = [
    { name: 'Work Team', emoji: '💼' },
    { name: 'Gym Buddies', emoji: '🏋️' },
    { name: 'Book Club', emoji: '📚' },
    { name: 'Gaming Squad', emoji: '🎮' },
  ];

  const createdGroups: { id: string; name: string }[] = [];
  for (const groupData of groupsData) {
    const [newGroup] = await db
      .insert(groups)
      .values({
        ownerId: userId,
        name: groupData.name,
        emoji: groupData.emoji,
        isDefault: false,
      })
      .returning();

    if (newGroup) {
      createdGroups.push({ id: newGroup.id, name: newGroup.name });
      console.log(`✅ Created group: ${groupData.emoji} ${groupData.name}`);
    }
  }

  return createdGroups;
}

async function seedActivities(userId: string): Promise<{ id: string; name: string }[]> {
  console.log('🎯 Creating mock activities...');

  const activitiesData = [
    { emoji: '☕', name: 'Coffee Chat' },
    { emoji: '🍕', name: 'Pizza Night' },
    { emoji: '🎬', name: 'Movie Marathon' },
    { emoji: '🏃', name: 'Morning Run' },
    { emoji: '🎸', name: 'Jam Session' },
    { emoji: '🧘', name: 'Yoga Class' },
  ];

  const createdActivities: { id: string; name: string }[] = [];
  for (const activityData of activitiesData) {
    const [newActivity] = await db
      .insert(activities)
      .values({
        userId,
        name: activityData.name,
        emoji: activityData.emoji,
        isDefault: false,
      })
      .returning();

    if (newActivity) {
      createdActivities.push({ id: newActivity.id, name: newActivity.name });
      console.log(`✅ Created activity: ${activityData.emoji} ${activityData.name}`);
    }
  }

  return createdActivities;
}

async function seedEvents(
  hostId: string,
  inviteeIds: string[],
  activityIds: string[],
): Promise<{ id: string; title: string }[]> {
  console.log('📅 Creating mock events...');

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(18, 0, 0, 0);

  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(14, 0, 0, 0);

  const eventsData = [
    {
      title: 'Coffee Meetup',
      activityId: activityIds[0],
      startTime: tomorrow,
      endTime: new Date(tomorrow.getTime() + 60 * 60 * 1000),
      location: 'Blue Bottle Coffee',
      notes: "Let's catch up!",
      inviteeIds: inviteeIds.slice(0, 2),
      showInviteList: true,
    },
    {
      title: 'Weekend Brunch',
      emoji: '🥐',
      startTime: nextWeek,
      endTime: new Date(nextWeek.getTime() + 2 * 60 * 60 * 1000),
      location: 'The Local Bistro',
      inviteeIds: inviteeIds,
      showInviteList: true,
    },
  ];

  const createdEvents: { id: string; title: string }[] = [];
  for (const eventData of eventsData) {
    const [newEvent] = await db
      .insert(events)
      .values({
        hostId,
        title: eventData.title,
        activityId: eventData.activityId ?? null,
        emoji: eventData.emoji ?? null,
        startTime: eventData.startTime,
        endTime: eventData.endTime,
        location: eventData.location ?? null,
        notes: eventData.notes ?? null,
        showInviteList: eventData.showInviteList,
        status: 'sent',
      })
      .returning();

    if (newEvent && eventData.inviteeIds.length > 0) {
      await db.insert(eventInvitees).values(
        eventData.inviteeIds.map((userId) => ({
          eventId: newEvent.id,
          userId,
          status: 'pending' as const,
        })),
      );

      createdEvents.push({ id: newEvent.id, title: newEvent.title });
      console.log(`✅ Created event: ${eventData.title} on ${eventData.startTime.toLocaleDateString()}`);
    }
  }

  return createdEvents;
}

async function seedFriendships(user1Id: string, user2Id: string): Promise<boolean> {
  console.log('🤝 Creating mock friendships...');

  // Create bidirectional friendships
  const now = new Date();
  await db.insert(friendships).values([
    {
      userId: user1Id,
      friendId: user2Id,
      status: 'accepted',
      initiatedBy: user1Id,
      acceptedAt: now,
    },
    {
      userId: user2Id,
      friendId: user1Id,
      status: 'accepted',
      initiatedBy: user1Id,
      acceptedAt: now,
    },
  ]);

  console.log(`✅ Created friendship between users`);
  return true;
}

async function seedAll() {
  console.log('🌱 Seeding all mock data...\n');

  // Ensure default activities exist
  await ensureDefaultActivities();
  console.log('');

  // Create users
  const createdUsers = await seedUsers();
  console.log('');

  if (createdUsers.length < 2) {
    console.error('❌ Need at least 2 users to seed other data');
    return;
  }

  const firstUser = createdUsers[0];
  const secondUser = createdUsers[1];

  if (!firstUser || !secondUser) {
    console.error('❌ Failed to create required users');
    return;
  }

  // Create friendships between first two users
  await seedFriendships(firstUser.id, secondUser.id);
  console.log('');

  // Create groups for first user
  const createdGroups = await seedGroups(firstUser.id);
  console.log('');

  // Create activities for first user
  const createdActivities = await seedActivities(firstUser.id);
  console.log('');

  // Create events hosted by first user, inviting other users
  const otherUserIds = createdUsers.slice(1).map((u) => u.id);
  const activityIds = createdActivities.map((a) => a.id);
  await seedEvents(firstUser.id, otherUserIds, activityIds);
  console.log('');

  console.log('🎉 Successfully seeded all mock data!');
  console.log('\nCreated:');
  console.log(`  - ${createdUsers.length} users`);
  console.log(`  - ${createdGroups.length} groups`);
  console.log(`  - ${createdActivities.length} activities`);
  console.log(`  - 2 events`);
  console.log(`  - 1 friendship`);
}

// Parse command line arguments
const modelArg = process.argv[2]?.toLowerCase() as SeedModel;

if (!modelArg) {
  console.error('❌ Error: Model type is required');
  console.error('\nUsage: npm run script:seed <MODEL>');
  console.error('\nValid models: users, events, groups, activities, friendships, all');
  process.exit(1);
}

async function main() {
  // Ensure default activities exist first
  await ensureDefaultActivities();

  switch (modelArg) {
    case 'users':
      await seedUsers();
      break;
    case 'groups':
      {
        const usersResult = await seedUsers();
        if (usersResult.length > 0 && usersResult[0]) {
          await seedGroups(usersResult[0].id);
        }
      }
      break;
    case 'activities':
      {
        const usersResult = await seedUsers();
        if (usersResult.length > 0 && usersResult[0]) {
          await seedActivities(usersResult[0].id);
        }
      }
      break;
    case 'events':
      {
        const usersResult = await seedUsers();
        if (usersResult.length >= 2 && usersResult[0]) {
          const activitiesResult = await seedActivities(usersResult[0].id);
          const otherUserIds = usersResult.slice(1).map((u) => u.id);
          const activityIds = activitiesResult.map((a) => a.id);
          await seedEvents(usersResult[0].id, otherUserIds, activityIds);
        }
      }
      break;
    case 'friendships':
      {
        const usersResult = await seedUsers();
        if (usersResult.length >= 2 && usersResult[0] && usersResult[1]) {
          await seedFriendships(usersResult[0].id, usersResult[1].id);
        }
      }
      break;
    case 'all':
      await seedAll();
      break;
    default:
      console.error(`❌ Error: Invalid model type: ${modelArg}`);
      console.error('\nValid models: users, events, groups, activities, friendships, all');
      process.exit(1);
  }
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
