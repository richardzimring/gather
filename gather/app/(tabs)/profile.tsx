import {
  Bell,
  Calendar,
  ChevronRight,
  Copy,
  LogOut,
  Plus,
  Share2,
  Shield,
  Trash2,
  User,
} from '@tamagui/lucide-icons'
import { router } from 'expo-router'
import { Alert, Share, Platform, RefreshControl } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import * as Haptics from 'expo-haptics'
import { useState } from 'react'
import { H1, ScrollView, Text, XStack, YStack, Circle, Theme, Switch } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { useAuth } from '../../lib/hooks/useAuth'
import { useInviteCode, useRefresh, useCalendarConnections, useUpdateCalendarConnection, useDeleteCalendarConnection } from '../../lib/hooks'
import type { CalendarConnection } from '../../lib/api/client'

interface SettingsItemProps {
  icon: React.ReactNode
  label: string
  value?: string
  showChevron?: boolean
  onPress?: () => void
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
  )
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets()
  const { user, signOut } = useAuth()
  const inviteCodeQuery = useInviteCode()
  const { data: inviteCodeData } = inviteCodeQuery
  const [copied, setCopied] = useState(false)
  const { isRefreshing, onRefresh } = useRefresh(inviteCodeQuery)
  
  // Calendar connections
  const { data: calendarConnections } = useCalendarConnections()
  const updateCalendarConnection = useUpdateCalendarConnection()
  const deleteCalendarConnection = useDeleteCalendarConnection()

  const inviteCode = inviteCodeData?.inviteCode ?? user?.inviteCode ?? ''
  
  const handleToggleImport = async (connectionId: string, currentValue: boolean) => {
    await updateCalendarConnection.mutateAsync({
      connectionId,
      data: { importEnabled: !currentValue }
    })
  }
  
  const handleToggleExport = async (connectionId: string, currentValue: boolean) => {
    await updateCalendarConnection.mutateAsync({
      connectionId,
      data: { exportEnabled: !currentValue }
    })
  }
  
  const handleDeleteCalendar = (connectionId: string, calendarName: string) => {
    Alert.alert(
      'Remove Calendar',
      `Are you sure you want to remove "${calendarName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await deleteCalendarConnection.mutateAsync(connectionId)
          },
        },
      ]
    )
  }

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut()
            router.replace('/(auth)/login')
          },
        },
      ]
    )
  }

  const handleCopyInviteCode = async () => {
    if (!inviteCode) return
    
    await Clipboard.setStringAsync(inviteCode)
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShareInviteCode = async () => {
    try {
      await Share.share({
        message: `Hey, add me on Gather! My invite code is: ${inviteCode}`,
      })
    } catch (err) {
      console.error('Failed to share:', err)
    }
  }

  return (
    <YStack flex={1} backgroundColor="$background">
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: 16,
        }}
      >
        {/* Header */}
        <H1 fontSize={28} fontWeight="700" marginBottom="$4">
          Profile
        </H1>

        {/* Profile Card */}
        <Theme name="Card">
          <Card marginBottom="$4">
            <XStack alignItems="center" gap="$4">
              <Circle size={72} backgroundColor="$backgroundHover">
                <Text fontSize={32} color="$white">
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

        {/* Invite Code */}
        <Theme name="Card">
          <Card marginBottom="$4">
            <Text color="$colorMuted" fontSize={13} fontWeight="600" marginBottom="$2">
              YOUR INVITE CODE
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
                {inviteCode || '------'}
              </Text>
            </YStack>
            <XStack gap="$2">
              <Button
                variant="outline"
                flex={1}
                icon={<Copy size={14} />}
                onPress={handleCopyInviteCode}
                disabled={!inviteCode}
              >
                {copied ? 'Copied!' : 'Copy'}
              </Button>
              <Button
                variant="primary"
                flex={1}
                icon={<Share2 size={14} color="$primaryForeground" />}
                onPress={handleShareInviteCode}
                disabled={!inviteCode}
              >
                Share
              </Button>
            </XStack>
          </Card>
        </Theme>

        {/* Calendar Connections */}
        <Theme name="Card">
          <Card marginBottom="$4">
            <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
              <Text color="$colorMuted" fontSize={13} fontWeight="600">
                CALENDAR CONNECTIONS
              </Text>
              <Button
                variant="ghost"
                buttonSize="sm"
                icon={<Plus size={16} />}
                onPress={() => {
                  // TODO: Open calendar connection flow
                  Alert.alert('Coming Soon', 'Calendar connection will be available soon.')
                }}
              >
                Add
              </Button>
            </XStack>
            
            {(!calendarConnections || calendarConnections.length === 0) ? (
              <YStack alignItems="center" padding="$4" gap="$2">
                <Calendar size={32} color="$colorMuted" />
                <Text color="$colorMuted" textAlign="center">
                  Connect your calendars to sync availability
                </Text>
                <Text color="$colorMuted" fontSize={12} textAlign="center">
                  Apple, Google, and Outlook supported
                </Text>
              </YStack>
            ) : (
              <YStack gap="$3">
                {calendarConnections.map((connection: CalendarConnection) => (
                  <YStack 
                    key={connection.connectionId} 
                    gap="$2"
                    padding="$3"
                    backgroundColor="$backgroundHover"
                    borderRadius="$3"
                  >
                    <XStack justifyContent="space-between" alignItems="center">
                      <YStack flex={1}>
                        <Text fontWeight="600">{connection.calendarName}</Text>
                        <Text color="$colorMuted" fontSize={12}>
                          {connection.provider.charAt(0).toUpperCase() + connection.provider.slice(1)}
                        </Text>
                      </YStack>
                      <Button
                        variant="ghost"
                        buttonSize="sm"
                        circular
                        icon={<Trash2 size={16} color="$error" />}
                        onPress={() => handleDeleteCalendar(connection.connectionId, connection.calendarName)}
                      />
                    </XStack>
                    <XStack justifyContent="space-between" alignItems="center">
                      <Text fontSize={13}>Import (read busy times)</Text>
                      <Switch
                        size="$3"
                        checked={connection.importEnabled}
                        onCheckedChange={() => handleToggleImport(connection.connectionId, connection.importEnabled)}
                      />
                    </XStack>
                    <XStack justifyContent="space-between" alignItems="center">
                      <Text fontSize={13}>Export (write events)</Text>
                      <Switch
                        size="$3"
                        checked={connection.exportEnabled}
                        onCheckedChange={() => handleToggleExport(connection.connectionId, connection.exportEnabled)}
                      />
                    </XStack>
                  </YStack>
                ))}
              </YStack>
            )}
          </Card>
        </Theme>

        {/* Settings Sections */}
        <Theme name="Card">
          <Card marginBottom="$4">
            <Text color="$colorMuted" fontSize={13} fontWeight="600" marginBottom="$2">
              PREFERENCES
            </Text>
            <SettingsItem
              icon={<Bell size={16} color="$colorMuted" />}
              label="Notifications"
              onPress={() => router.push('/notifications/settings')}
            />
          </Card>
        </Theme>

        <Theme name="Card">
          <Card marginBottom="$4">
            <Text color="$colorMuted" fontSize={13} fontWeight="600" marginBottom="$2">
              ACCOUNT
            </Text>
            <SettingsItem
              icon={<User size={16} color="$colorMuted" />}
              label="Account Settings"
              onPress={() => router.push('/profile/edit')}
            />
            <SettingsItem
              icon={<Shield size={16} color="$colorMuted" />}
              label="Privacy"
              onPress={() => {}}
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
  )
}
