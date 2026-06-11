import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Linking, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Text, YStack } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../../components/ui/Button';
import { BackHeader } from '../../components/ui/ScreenHeader';
import { haptic } from '../../lib/haptics';

/**
 * Extract a friend invite code from a scanned value. Accepts either a full
 * universal link (https://gather.rzimring.com/invite/<code>) or a raw code.
 */
function extractInviteCode(data: string): string | null {
  const trimmed = data.trim();
  const match = trimmed.match(/\/invite\/([^/?#]+)/i);
  if (match?.[1]) {
    return decodeURIComponent(match[1]).toUpperCase();
  }
  // Fall back to a bare alphanumeric code.
  if (/^[a-z0-9]{6,12}$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }
  return null;
}

export default function ScanFriendScreen() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [error, setError] = useState<string | null>(null);
  const handled = useRef(false);

  const handleScanned = ({ data }: { data: string }) => {
    if (handled.current) return;
    const code = extractInviteCode(data);
    if (!code) {
      setError("That doesn't look like a Gather code.");
      return;
    }
    handled.current = true;
    haptic.success();
    router.replace({ pathname: '/invite/[code]', params: { code } });
  };

  return (
    <YStack flex={1} backgroundColor="$background">
      <YStack paddingTop={insets.top + 16} paddingHorizontal={16} zIndex={1}>
        <BackHeader title="Scan Code" />
      </YStack>

      {!permission ? (
        <YStack flex={1} alignItems="center" justifyContent="center" />
      ) : !permission.granted ? (
        <YStack
          flex={1}
          alignItems="center"
          justifyContent="center"
          padding="$5"
          gap="$3"
        >
          <Text color="$colorMuted" fontSize={14} textAlign="center">
            Gather needs camera access to scan your friend&apos;s QR code.
          </Text>
          {permission.canAskAgain ? (
            <Button variant="primary" onPress={requestPermission}>
              Allow Camera
            </Button>
          ) : (
            <Button variant="outline" onPress={() => Linking.openSettings()}>
              Open Settings
            </Button>
          )}
        </YStack>
      ) : (
        <YStack flex={1}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={handleScanned}
          />
          <YStack
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            alignItems="center"
            justifyContent="center"
            pointerEvents="none"
          >
            <YStack
              width={240}
              height={240}
              borderWidth={2}
              borderColor="rgba(255,255,255,0.9)"
              borderRadius={16}
            />
          </YStack>
          <YStack
            position="absolute"
            bottom={insets.bottom + 40}
            left={0}
            right={0}
            alignItems="center"
            paddingHorizontal="$5"
          >
            <Text
              color="white"
              fontSize={14}
              textAlign="center"
              backgroundColor="rgba(0,0,0,0.5)"
              paddingHorizontal="$3"
              paddingVertical="$2"
              borderRadius="$3"
            >
              {error ?? "Point at a friend's Gather QR code"}
            </Text>
          </YStack>
        </YStack>
      )}
    </YStack>
  );
}
