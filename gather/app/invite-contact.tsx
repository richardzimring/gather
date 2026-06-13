import { Check } from '@tamagui/lucide-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Linking } from 'react-native';
import { Circle, Text, Theme, XStack, YStack } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { BackHeader } from '../components/ui/ScreenHeader';
import { SearchBar } from '../components/ui/SearchBar';
import { Spinner } from '../components/ui/Spinner';
import {
  ContactsPermissionError,
  getContactInitials,
  getContactsWithPhones,
  type DeviceContact,
} from '../lib/contacts';
import { useCreateInvite } from '../lib/hooks';
import { haptic } from '../lib/haptics';
import {
  eventInviteSmsMessage,
  friendInviteSmsMessage,
} from '../lib/inviteMessages';

type Step = 'loading' | 'ready' | 'denied';

export default function InviteContactScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    type?: string;
    eventId?: string;
    title?: string;
  }>();
  const inviteType = params.type === 'event' ? 'event' : 'friend';

  const createInvite = useCreateInvite();

  const [step, setStep] = useState<Step>('loading');
  const [contacts, setContacts] = useState<DeviceContact[]>([]);
  const [search, setSearch] = useState('');
  const [invited, setInvited] = useState<Set<string>>(new Set());
  const [invitingPhone, setInvitingPhone] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const result = await getContactsWithPhones();
        if (!active) return;
        setContacts(result);
        setStep('ready');
      } catch (error) {
        if (!active) return;
        if (error instanceof ContactsPermissionError) {
          setStep('denied');
        } else {
          console.error('Failed to load contacts:', error);
          setContacts([]);
          setStep('ready');
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    // Only match on phone when the query has digits — an all-letters query
    // reduces to '' and ''.includes matches everything.
    const digits = q.replace(/\D/g, '');
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (digits.length > 0 && c.phone.replace(/\D/g, '').includes(digits)),
    );
  }, [contacts, search]);

  const handleInvite = async (contact: DeviceContact) => {
    setInvitingPhone(contact.phone);
    setInviteError(null);
    try {
      const result = await createInvite.mutateAsync({
        type: inviteType,
        phone: contact.phone,
        eventId: inviteType === 'event' ? params.eventId : undefined,
      });

      const message =
        inviteType === 'event' && params.title
          ? eventInviteSmsMessage(params.title, result.inviteUrl)
          : friendInviteSmsMessage(result.inviteUrl);

      // iOS uses '&' (not '?') before the body param.
      const url = `sms:${contact.phone}&body=${encodeURIComponent(message)}`;
      await Linking.openURL(url);
      haptic.success();
      setInvited((prev) => new Set(prev).add(contact.phone));
    } catch (error) {
      haptic.error();
      console.error('Failed to create invite:', error);
      setInviteError('Could not create invite. Please try again.');
    } finally {
      setInvitingPhone(null);
    }
  };

  const heading =
    inviteType === 'event'
      ? params.title
        ? `Invite to "${params.title}"`
        : 'Invite to this event'
      : 'Invite a friend to Gather';
  const subtitle =
    inviteType === 'event'
      ? 'Pick a contact and we\u2019ll open a prefilled message with the invite link.'
      : 'Pick a contact and we\u2019ll open a prefilled message inviting them to join you on Gather.';

  return (
    <YStack flex={1} backgroundColor="$background">
      <YStack paddingTop={insets.top + 16} paddingHorizontal={16}>
        <BackHeader title="Invite by Text" />
        <YStack gap="$2" paddingBottom="$3">
          <Text fontSize={18} fontWeight="600">
            {heading}
          </Text>
          <Text color="$colorMuted" fontSize={13}>
            {subtitle}
          </Text>
          {inviteError && (
            <Text color="$destructive" fontSize={13}>
              {inviteError}
            </Text>
          )}
        </YStack>

        {step === 'ready' && (
          <YStack marginBottom="$3">
            <SearchBar
              placeholder="Search contacts"
              value={search}
              onChangeText={setSearch}
            />
          </YStack>
        )}
      </YStack>

      {step === 'loading' && (
        <YStack flex={1} alignItems="center" justifyContent="center" gap="$2">
          <Spinner size="small" color="$color" />
          <Text color="$colorMuted" fontSize={13}>
            Loading contacts...
          </Text>
        </YStack>
      )}

      {step === 'denied' && (
        <YStack
          flex={1}
          alignItems="center"
          justifyContent="center"
          padding="$5"
          gap="$3"
        >
          <Text color="$colorMuted" fontSize={14} textAlign="center">
            Contacts access is off. Turn it on in Settings to invite people from
            your contacts.
          </Text>
          <Button variant="outline" onPress={() => Linking.openSettings()}>
            Open Settings
          </Button>
        </YStack>
      )}

      {step === 'ready' && (
        <Theme name="Card">
          <Card
            flex={1}
            marginHorizontal={16}
            marginBottom={insets.bottom + 16}
            overflow="hidden"
          >
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.phone}
              contentContainerStyle={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                paddingBottom: insets.bottom + 24,
                flexGrow: 1,
              }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              ListEmptyComponent={
                <YStack alignItems="center" padding="$5">
                  <Text color="$colorMuted" fontSize={14} textAlign="center">
                    No contacts found.
                  </Text>
                </YStack>
              }
              renderItem={({ item }) => {
                const isInvited = invited.has(item.phone);
                const isInviting = invitingPhone === item.phone;
                return (
                  <XStack alignItems="center" gap="$3" paddingVertical="$2">
                    <Circle size={40} backgroundColor="$backgroundHover">
                      <Text fontSize={14} fontWeight="600">
                        {getContactInitials(item.name)}
                      </Text>
                    </Circle>
                    <YStack flex={1}>
                      <Text fontWeight="500" numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text color="$colorMuted" fontSize={12} numberOfLines={1}>
                        {item.phone}
                      </Text>
                    </YStack>
                    {isInvited ? (
                      <XStack alignItems="center" gap="$1">
                        <Check size={16} color="$success" />
                        <Text color="$success" fontSize={13}>
                          Invited
                        </Text>
                      </XStack>
                    ) : (
                      <Button
                        variant="outline"
                        buttonSize="sm"
                        onPress={() => handleInvite(item)}
                        loading={isInviting}
                        disabled={invitingPhone !== null}
                      >
                        Invite
                      </Button>
                    )}
                  </XStack>
                );
              }}
            />
          </Card>
        </Theme>
      )}
    </YStack>
  );
}
