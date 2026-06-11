import { NativeTabs } from 'expo-router/unstable-native-tabs';
import {
  ThemeProvider,
  DarkTheme,
  DefaultTheme,
} from '@react-navigation/native';
import { useMemo, useRef, useEffect } from 'react';
import { DynamicColorIOS, useColorScheme } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';

import { useAuth } from '../../lib/hooks/useAuth';
import {
  useEvents,
  useFriends,
  useNotifications,
  useCalendarAutoSync,
  useAppleExportSync,
  usePendingInvite,
} from '../../lib/hooks';
import { haptic } from '../../lib/haptics';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const previousTab = useRef<string | null>(null);

  // Redirect to login when a mid-session token expiry is detected
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Trigger haptic feedback on tab change
  useEffect(() => {
    const currentTab = pathname.split('/')[1] || 'index';
    if (previousTab.current !== null && previousTab.current !== currentTab) {
      haptic.selection();
    }
    previousTab.current = currentTab;
  }, [pathname]);

  // Register push token and set up notification listeners
  useNotifications();

  // Redeem any invite that was opened while signed out
  usePendingInvite();

  // Auto-sync connected calendars on app foreground
  useCalendarAutoSync();

  // Pending event invitations (where user is invitee with status "pending" and not the host)
  const { data: events } = useEvents();
  const pendingEventCount = useMemo(() => {
    return (
      events?.filter((event) => {
        const userInvitee = event.invitees.find(
          (i) => i.userId === user?.userId && i.status === 'pending',
        );
        return userInvitee && event.hostId !== user?.userId;
      }).length ?? 0
    );
  }, [events, user?.userId]);

  // Sync Gather events to Apple Calendar when export is enabled
  useAppleExportSync(events, user?.userId);

  // Pending friend requests received
  const { data: friendsData } = useFriends();
  const pendingFriendCount = useMemo(
    () => friendsData?.pendingReceived?.length ?? 0,
    [friendsData],
  );

  // Total notification count (for app icon badge)
  const totalNotificationCount = pendingEventCount + pendingFriendCount;

  // Update app icon badge count
  useEffect(() => {
    Notifications.setBadgeCountAsync(totalNotificationCount).catch((error) => {
      console.error('Failed to set badge count:', error);
    });
  }, [totalNotificationCount]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <NativeTabs
        minimizeBehavior="onScrollDown"
        labelStyle={{
          color: DynamicColorIOS({
            dark: 'white',
            light: 'black',
          }),
        }}
        tintColor={DynamicColorIOS({
          dark: 'white',
          light: 'black',
        })}
      >
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{ default: 'house', selected: 'house.fill' }}
          />
          <NativeTabs.Trigger.Badge hidden={pendingEventCount === 0}>
            {pendingEventCount > 0 ? String(pendingEventCount) : undefined}
          </NativeTabs.Trigger.Badge>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="plan">
          <NativeTabs.Trigger.Label>Plan</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{
              default: 'calendar.badge.plus',
              selected: 'calendar.badge.plus',
            }}
          />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="friends">
          <NativeTabs.Trigger.Label>Friends</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{ default: 'person.2', selected: 'person.2.fill' }}
          />
          <NativeTabs.Trigger.Badge hidden={pendingFriendCount === 0}>
            {pendingFriendCount > 0 ? String(pendingFriendCount) : undefined}
          </NativeTabs.Trigger.Badge>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="profile">
          <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{ default: 'person', selected: 'person.fill' }}
          />
        </NativeTabs.Trigger>
      </NativeTabs>
    </ThemeProvider>
  );
}
