import {
  Bell,
  Calendar,
  ChevronRight,
  Copy,
  LogOut,
  Moon,
  Settings,
  Share2,
  Shield,
  User,
} from '@tamagui/lucide-icons'
import { router } from 'expo-router'
import { Alert, Share, Platform } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import * as Haptics from 'expo-haptics'
import { useState } from 'react'
import { H1, ScrollView, Text, XStack, YStack, Circle, Theme } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { DottedGridBackground } from '../../components/ui/DottedGridBackground'
import { useAuth } from '../../lib/hooks/useAuth'
import { useInviteCode } from '../../lib/hooks'

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
  const { data: inviteCodeData } = useInviteCode()
  const [copied, setCopied] = useState(false)

  const inviteCode = inviteCodeData?.inviteCode ?? user?.inviteCode ?? ''

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
        message: `Join me on Gather! Use my invite code: ${inviteCode}`,
      })
    } catch (err) {
      console.error('Failed to share:', err)
    }
  }

  return (
    <DottedGridBackground>
      <ScrollView
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
              <Circle size={72} backgroundColor="$accent">
                <Text fontSize={32} color="$white">
                  {user?.displayName?.[0] ?? '?'}
                </Text>
              </Circle>
              <YStack flex={1}>
                <Text fontSize={20} fontWeight="600">
                  {user?.displayName ?? 'Unknown'}
                </Text>
                <Text color="$colorMuted">{user?.email ?? 'No email'}</Text>
              </YStack>
            </XStack>
            <Button
              variant="secondary"
              marginTop="$4"
              fullWidth
              onPress={() => router.push('/profile/edit')}
            >
              Edit Profile
            </Button>
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
              borderRadius="$3"
              padding="$3"
              alignItems="center"
              marginBottom="$3"
            >
              <Text
                fontSize={24}
                fontWeight="700"
                letterSpacing={3}
                color="$accent"
              >
                {inviteCode || '------'}
              </Text>
            </YStack>
            <XStack gap="$3">
              <Button
                variant="secondary"
                flex={1}
                icon={<Copy size={16} />}
                onPress={handleCopyInviteCode}
                disabled={!inviteCode}
              >
                {copied ? 'Copied!' : 'Copy'}
              </Button>
              <Button
                variant="primary"
                flex={1}
                icon={<Share2 size={16} color="white" />}
                onPress={handleShareInviteCode}
                disabled={!inviteCode}
              >
                Share
              </Button>
            </XStack>
          </Card>
        </Theme>

        {/* Settings Sections */}
        <Theme name="Card">
          <Card marginBottom="$4">
            <Text color="$colorMuted" fontSize={13} fontWeight="600" marginBottom="$2">
              PREFERENCES
            </Text>
            <SettingsItem
              icon={<Bell size={18} color="$accent" />}
              label="Notifications"
              onPress={() => router.push('/notifications')}
            />
            <SettingsItem
              icon={<Calendar size={18} color="$accent" />}
              label="Calendar Sync"
              value={user?.calendarSyncEnabled ? 'Enabled' : 'Disabled'}
              onPress={() => {}}
            />
            <XStack alignItems="center" paddingVertical="$3">
              <YStack
                width={36}
                height={36}
                borderRadius={8}
                backgroundColor="$backgroundHover"
                alignItems="center"
                justifyContent="center"
                marginRight="$3"
              >
                <Moon size={18} color="$accent" />
              </YStack>
              <Text flex={1} fontWeight="500">
                Dark Mode
              </Text>
              <Text color="$colorMuted" fontSize={12} marginRight="$2">
                System
              </Text>
            </XStack>
          </Card>
        </Theme>

        <Theme name="Card">
          <Card marginBottom="$4">
            <Text color="$colorMuted" fontSize={13} fontWeight="600" marginBottom="$2">
              ACCOUNT
            </Text>
            <SettingsItem
              icon={<User size={18} color="$accent" />}
              label="Account Settings"
              onPress={() => router.push('/profile/edit')}
            />
            <SettingsItem
              icon={<Shield size={18} color="$accent" />}
              label="Privacy"
              onPress={() => {}}
            />
            <SettingsItem
              icon={<Settings size={18} color="$accent" />}
              label="App Settings"
              onPress={() => {}}
            />
          </Card>
        </Theme>

        {/* Sign Out */}
        <Button
          variant="danger"
          fullWidth
          icon={<LogOut size={18} color="white" />}
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
    </DottedGridBackground>
  )
}
