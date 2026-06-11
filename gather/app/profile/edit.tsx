import { router } from 'expo-router';
import { useState } from 'react';
import { Input, ScrollView, Text, Theme, XStack, YStack } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { BackHeader } from '../../components/ui/ScreenHeader';
import { useAuth } from '../../lib/hooks/useAuth';
import { useUpdateUser } from '../../lib/hooks';
import { haptic } from '../../lib/haptics';
import { isPlausiblePhone } from '../../lib/phone';
import { getDeviceTimezone } from '../../lib/utils';

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, refreshUser } = useAuth();
  const updateUser = useUpdateUser();

  const [phone, setPhone] = useState(user?.phone ?? '');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneSaved, setPhoneSaved] = useState(false);

  const phoneDirty = phone.trim() !== (user?.phone ?? '');

  const handleSavePhone = async () => {
    const trimmed = phone.trim();
    if (trimmed !== '' && !isPlausiblePhone(trimmed)) {
      setPhoneError('Please enter a valid phone number.');
      return;
    }
    setPhoneError(null);
    try {
      // Empty string clears the number server-side.
      const updated = await updateUser.mutateAsync({
        phone: trimmed === '' ? null : trimmed,
      });
      await refreshUser();
      // Adopt the server-normalized (E.164) value so the field is no longer
      // dirty after a save.
      setPhone(updated?.phone ?? '');
      haptic.success();
      setPhoneSaved(true);
      setTimeout(() => setPhoneSaved(false), 2000);
    } catch (err) {
      haptic.error();
      setPhoneError(
        err instanceof Error && err.message
          ? err.message
          : "That number doesn't look right. Please try again.",
      );
    }
  };

  return (
    <YStack flex={1} backgroundColor="$background">
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: 16,
        }}
      >
        {/* Header */}
        <BackHeader title="Edit Profile" onBack={() => router.back()} />

        {/* Form */}
        <Theme name="Card">
          <Card marginBottom="$4">
            <YStack gap="$3">
              <YStack gap="$2">
                <Text fontWeight="500" fontSize={14}>
                  Name
                </Text>
                <YStack
                  backgroundColor="$backgroundHover"
                  borderColor="$borderColor"
                  borderWidth={1}
                  borderRadius="$2"
                  paddingHorizontal="$3"
                  height={36}
                  justifyContent="center"
                >
                  <Text color="$colorMuted" fontSize={14}>
                    {user?.fullName ?? 'Unknown'}
                  </Text>
                </YStack>
                <Text color="$colorMuted" fontSize={11}>
                  Name is provided by Apple and cannot be changed
                </Text>
              </YStack>

              <YStack gap="$2">
                <Text fontWeight="500" fontSize={14}>
                  Email
                </Text>
                <YStack
                  backgroundColor="$backgroundHover"
                  borderColor="$borderColor"
                  borderWidth={1}
                  borderRadius="$2"
                  paddingHorizontal="$3"
                  height={36}
                  justifyContent="center"
                >
                  <Text color="$colorMuted" fontSize={14}>
                    {user?.email ?? 'No email'}
                  </Text>
                </YStack>
                <Text color="$colorMuted" fontSize={11}>
                  Email is provided by Apple and cannot be changed
                </Text>
              </YStack>

              <YStack gap="$2">
                <Text fontWeight="500" fontSize={14}>
                  Phone Number
                </Text>
                <Input
                  placeholder="(555) 123-4567"
                  placeholderTextColor="$colorMuted"
                  value={phone}
                  onChangeText={(text) => {
                    setPhone(text);
                    setPhoneError(null);
                  }}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  textContentType="telephoneNumber"
                  backgroundColor="$backgroundHover"
                  borderColor={phoneError ? '$destructive' : '$borderColor'}
                  borderWidth={1}
                  borderRadius="$2"
                  paddingHorizontal="$3"
                  height={36}
                  fontSize={14}
                />
                {phoneError ? (
                  <Text color="$destructive" fontSize={11}>
                    {phoneError}
                  </Text>
                ) : (
                  <Text color="$colorMuted" fontSize={11}>
                    Used to help friends find you. Never shown publicly.
                  </Text>
                )}
                {phoneDirty && (
                  <Button
                    variant="primary"
                    buttonSize="sm"
                    onPress={handleSavePhone}
                    loading={updateUser.isPending}
                  >
                    Save
                  </Button>
                )}
                {phoneSaved && (
                  <Text color="$success" fontSize={11}>
                    Saved!
                  </Text>
                )}
              </YStack>
            </YStack>
          </Card>
        </Theme>

        {/* Account Info */}
        <Theme name="Card">
          <Card>
            <Text fontWeight="500" fontSize={14} marginBottom="$3">
              Account Information
            </Text>
            <YStack gap="$2">
              <XStack justifyContent="space-between">
                <Text color="$colorMuted" fontSize={13}>
                  User ID
                </Text>
                <Text numberOfLines={1} maxWidth={150} fontSize={13}>
                  {user?.userId?.slice(0, 8)}...
                </Text>
              </XStack>
              <XStack justifyContent="space-between">
                <Text color="$colorMuted" fontSize={13}>
                  Timezone
                </Text>
                <Text fontSize={13}>{getDeviceTimezone()}</Text>
              </XStack>
              <XStack justifyContent="space-between">
                <Text color="$colorMuted" fontSize={13}>
                  Friend Code
                </Text>
                <Text fontWeight="600" fontSize={13}>
                  {user?.inviteCode ?? 'N/A'}
                </Text>
              </XStack>
            </YStack>
          </Card>
        </Theme>
      </ScrollView>
    </YStack>
  );
}
