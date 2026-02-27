import {
  Bell,
  Calendar,
  ChevronRight,
  Clock,
  Copy,
  LogOut,
  RefreshCw,
  Share2,
  Shield,
  User,
  UserX,
} from '@tamagui/lucide-icons';
import { router } from 'expo-router';
import { Alert, Share, RefreshControl } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import {
  H1,
  ScrollView,
  Text,
  XStack,
  YStack,
  Circle,
  Theme,
  useTheme,
} from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../../components/ui/Button';
import { GradientBackground } from '../../components/ui/GradientBackground';
import { CalendarProviderIcon } from '../../components/ui/CalendarProviderIcon';
import { Card } from '../../components/ui/Card';
import { SkeletonBar, SkeletonCircle } from '../../components/ui/Skeleton';
import { useAuth } from '../../lib/hooks/useAuth';
import {
  useFriendCode,
  useRefresh,
  useCalendarConnections,
  useTriggerCalendarSync,
  useDeleteAccount,
  useScrollGradient,
} from '../../lib/hooks';
import type { CalendarConnection } from '../../lib/api/client';
import { haptic } from '../../lib/haptics';

interface SettingsItemProps {
  icon: React.ReactNode;
  label: string;
  value?: string;
  showChevron?: boolean;
  onPress?: () => void;
}

function SettingsItem({
  icon,
  label,
  value,
  showChevron = true,
  onPress,
}: SettingsItemProps) {
  return (
    <XStack
      alignItems="center"
      paddingVertical="$3"
      pressStyle={{ opacity: 0.7 }}
      onPress={onPress}
    >
      <YStack
        width={36}
        height={36}
        borderRadius={8}
        backgroundColor="$backgroundHover"
        alignItems="center"
        justifyContent="center"
        marginRight="$3"
      >
        {icon}
      </YStack>
      <Text flex={1} fontWeight="500">
        {label}
      </Text>
      {value && (
        <Text color="$colorMuted" marginRight="$2">
          {value}
        </Text>
      )}
      {showChevron && <ChevronRight size={20} color="$colorMuted" />}
    </XStack>
  );
}

function formatLastSync(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;

  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { user, signOut } = useAuth();
  const friendCodeQuery = useFriendCode();
  const { data: friendCodeData } = friendCodeQuery;
  const [copied, setCopied] = useState(false);
  const { isRefreshing, onRefresh } = useRefresh(friendCodeQuery);

  // Calendar connections
  const { data: calendarConnections, isLoading: isLoadingCalendars } =
    useCalendarConnections();
  const triggerSync = useTriggerCalendarSync();

  const deleteAccount = useDeleteAccount();

  const friendCode = friendCodeData?.inviteCode ?? user?.inviteCode ?? '';

  const handleDeleteAccount = () => {
    haptic.warning();
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This will permanently remove all your data, events, and friendships. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            // Second confirmation for safety
            haptic.warning();
            Alert.alert(
              'Are you absolutely sure?',
              'This will permanently delete your account and all associated data.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete My Account',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await deleteAccount.mutateAsync();
                      await signOut();
                      router.replace('/(auth)/login');
                    } catch (err) {
                      haptic.error();
                      console.error('Failed to delete account:', err);
                      Alert.alert(
                        'Error',
                        'Failed to delete your account. Please try again later.',
                      );
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  const handleSignOut = async () => {
    haptic.warning();
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const handleCopyFriendCode = async () => {
    if (!friendCode) return;

    await Clipboard.setStringAsync(friendCode);
    haptic.success();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareFriendCode = async () => {
    try {
      await Share.share({
        url: 'https://apps.apple.com/us/app/gather-plan-with-friends/id6759443297',
        message: `Hey, add me on Gather! My friend code is: ${friendCode}`,
      });
    } catch (err) {
      console.error('Failed to share:', err);
    }
  };

  const { gradientOpacity, scrollProps } = useScrollGradient();

  return (
    <YStack flex={1} backgroundColor="$background">
      <GradientBackground style={{ opacity: gradientOpacity }} />
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={theme.color.val}
            colors={[theme.color.val]}
          />
        }
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: 16,
        }}
        {...scrollProps}
      >
        {/* Header */}
        <YStack paddingBottom="$3">
          <H1 fontSize={28} fontWeight="700">
            Profile
          </H1>
        </YStack>
        {/* Profile Card */}
        <Theme name="Card">
          <Card marginBottom="$4">
            <XStack alignItems="center" gap="$4">
              <Circle size={72} backgroundColor="$backgroundHover">
                <Text fontSize={32}>
                  {user?.firstName?.[0]?.toUpperCase() ?? '?'}
                  {user?.lastName?.[0]?.toUpperCase() ?? ''}
                </Text>
              </Circle>
              <YStack flex={1}>
                <Text fontSize={20} fontWeight="600">
                  {user?.fullName ?? 'Unknown'}
                </Text>
                <Text color="$colorMuted">{user?.email ?? 'No email'}</Text>
              </YStack>
            </XStack>
            {/* <Button
              variant="secondary"
              marginTop="$4"
              fullWidth
              onPress={() => router.push('/profile/edit')}
            >
              Edit Profile
            </Button> */}
          </Card>
        </Theme>

        {/* Friend Code */}
        <Theme name="Card">
          <Card marginBottom="$4">
            <Text
              color="$colorMuted"
              fontSize={13}
              fontWeight="600"
              marginBottom="$2"
            >
              YOUR FRIEND CODE
            </Text>
            <YStack
              backgroundColor="$backgroundHover"
              borderRadius="$2"
              padding="$3"
              alignItems="center"
              marginBottom="$3"
            >
              <Text
                fontSize={20}
                fontWeight="600"
                letterSpacing={2}
                fontFamily="$body"
              >
                {friendCode || '------'}
              </Text>
            </YStack>
            <XStack gap="$2">
              <Button
                variant="outline"
                flex={1}
                icon={<Copy size={14} />}
                onPress={handleCopyFriendCode}
                disabled={!friendCode}
              >
                {copied ? 'Copied!' : 'Copy'}
              </Button>
              <Button
                variant="primary"
                flex={1}
                icon={<Share2 size={14} color="$primaryForeground" />}
                onPress={handleShareFriendCode}
                disabled={!friendCode}
              >
                Share
              </Button>
            </XStack>
          </Card>
        </Theme>

        {/* Calendar Connections */}
        <Theme name="Card">
          <Card marginBottom="$4">
            <XStack
              justifyContent="space-between"
              alignItems="center"
              marginBottom="$3"
            >
              <Text color="$colorMuted" fontSize={13} fontWeight="600">
                CALENDAR INTEGRATIONS
              </Text>
              <XStack gap="$2">
                {calendarConnections && calendarConnections.length > 0 && (
                  <Button
                    variant="ghost"
                    buttonSize="sm"
                    icon={<RefreshCw size={16} />}
                    onPress={() => triggerSync.mutate()}
                    loading={triggerSync.isPending}
                    loadingText="Syncing..."
                  >
                    Sync
                  </Button>
                )}
              </XStack>
            </XStack>

            {isLoadingCalendars ? (
              // Skeleton loading
              <YStack gap="$3">
                {[1, 2].map((i) => (
                  <XStack
                    key={i}
                    padding="$3"
                    backgroundColor="$backgroundHover"
                    borderRadius="$3"
                    alignItems="center"
                    gap="$2"
                  >
                    <SkeletonCircle size={10} />
                    <YStack flex={1} gap="$1">
                      <SkeletonBar width={150} height={14} />
                      <SkeletonBar width={80} height={11} />
                    </YStack>
                    <SkeletonCircle size={32} />
                  </XStack>
                ))}
              </YStack>
            ) : !calendarConnections ||
              calendarConnections.filter((c) => c.importEnabled).length ===
                0 ? (
              <YStack alignItems="center" padding="$4" gap="$3">
                <Calendar size={32} color="$colorMuted" />
                <Text color="$colorMuted" textAlign="center">
                  Connect your calendars to sync availability
                </Text>
                <Button
                  variant="outline"
                  buttonSize="sm"
                  onPress={() => router.push('/calendars/connect')}
                >
                  Add Calendars
                </Button>
              </YStack>
            ) : (
              <YStack gap="$3">
                {calendarConnections
                  .filter((c) => c.importEnabled)
                  .map((connection: CalendarConnection) => (
                    <XStack
                      key={connection.connectionId}
                      padding="$3"
                      backgroundColor="$backgroundHover"
                      borderRadius="$3"
                      alignItems="center"
                      gap="$2"
                      pressStyle={{ opacity: 0.7 }}
                      onPress={() => {
                        haptic.light();
                        router.push({
                          pathname: '/calendars/[provider]',
                          params: { provider: connection.provider },
                        });
                      }}
                    >
                      {connection.color && (
                        <Circle size={10} backgroundColor={connection.color} />
                      )}
                      <YStack flex={1}>
                        <XStack alignItems="center" gap="$1.5">
                          <Text
                            fontWeight="600"
                            numberOfLines={1}
                            flexShrink={1}
                          >
                            {connection.calendarName}
                          </Text>
                          <CalendarProviderIcon
                            provider={connection.provider}
                            size={14}
                          />
                        </XStack>
                        {connection.lastSyncAt && (
                          <Text color="$colorMuted" fontSize={11}>
                            Synced {formatLastSync(connection.lastSyncAt)}
                          </Text>
                        )}
                      </YStack>
                      <ChevronRight size={16} color="$colorMuted" />
                    </XStack>
                  ))}
                <Button
                  variant="outline"
                  buttonSize="sm"
                  marginTop="$1"
                  onPress={() => router.push('/calendars/connect')}
                >
                  Manage Calendars
                </Button>
              </YStack>
            )}
          </Card>
        </Theme>

        {/* Settings Sections */}
        <Theme name="Card">
          <Card marginBottom="$4">
            <Text
              color="$colorMuted"
              fontSize={13}
              fontWeight="600"
              marginBottom="$2"
            >
              PREFERENCES
            </Text>
            <SettingsItem
              icon={<Bell size={16} color="$colorMuted" />}
              label="Notifications"
              onPress={() => router.push('/notifications/settings')}
            />
            <SettingsItem
              icon={<Clock size={16} color="$colorMuted" />}
              label="Blocked Windows"
              onPress={() => router.push('/blocked')}
            />
          </Card>
        </Theme>

        <Theme name="Card">
          <Card marginBottom="$4">
            <Text
              color="$colorMuted"
              fontSize={13}
              fontWeight="600"
              marginBottom="$2"
            >
              ACCOUNT
            </Text>
            <SettingsItem
              icon={<User size={16} color="$colorMuted" />}
              label="Account Settings"
              onPress={() => router.push('/profile/edit')}
            />
            <SettingsItem
              icon={<Shield size={16} color="$colorMuted" />}
              label="Privacy Policy"
              onPress={() => router.push('/legal/privacy')}
            />
          </Card>
        </Theme>

        {/* Sign Out */}
        <Button
          variant="destructive"
          fullWidth
          icon={<LogOut size={16} color="$destructiveForeground" />}
          onPress={handleSignOut}
        >
          Sign Out
        </Button>

        {/* Delete Account */}
        <Button
          variant="ghost"
          fullWidth
          marginTop="$3"
          icon={<UserX size={16} color="$error" />}
          onPress={handleDeleteAccount}
          loading={deleteAccount.isPending}
          loadingText="Deleting..."
        >
          <Text color="$error" fontSize={14} fontWeight="500">
            Delete Account
          </Text>
        </Button>

        {/* App Version */}
        <Text
          color="$colorMuted"
          fontSize={12}
          textAlign="center"
          marginTop="$4"
        >
          Gather v1.0.0
        </Text>
      </ScrollView>
    </YStack>
  );
}
