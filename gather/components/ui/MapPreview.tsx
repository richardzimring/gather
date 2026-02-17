import { Linking, Platform } from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import { YStack, XStack, Text } from "tamagui";
import { MapPin } from "@tamagui/lucide-icons";

export interface MapPreviewProps {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
  height?: number;
  interactive?: boolean;
}

/**
 * Map preview component using Apple Maps (native iOS)
 * Tappable to open directions in Apple Maps app
 */
export function MapPreview({
  latitude,
  longitude,
  name,
  address,
  height = 150,
  interactive = false,
}: MapPreviewProps) {
  const handlePress = () => {
    // Open in Apple Maps with directions
    const label = encodeURIComponent(name || "Event Location");
    const url = Platform.select({
      ios: `maps://app?daddr=${latitude},${longitude}&q=${label}`,
      default: `https://maps.apple.com/?daddr=${latitude},${longitude}&q=${label}`,
    });

    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      }
    });
  };

  return (
    <YStack gap="$2">
      <YStack
        borderRadius="$3"
        overflow="hidden"
        borderWidth={1}
        borderColor="$borderColor"
      >
        <MapView
          provider={PROVIDER_DEFAULT}
          style={{ width: "100%", height }}
          initialRegion={{
            latitude,
            longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }}
          scrollEnabled={interactive}
          zoomEnabled={interactive}
          rotateEnabled={false}
          pitchEnabled={false}
          onPress={!interactive ? handlePress : undefined}
        >
          <Marker
            coordinate={{ latitude, longitude }}
            title={name}
            description={address}
          />
        </MapView>
      </YStack>
      {address && (
        <XStack
          backgroundColor="$accentSubtle"
          padding="$2"
          borderRadius="$2"
          alignItems="center"
          justifyContent="center"
          gap="$2"
        >
          <MapPin size={14} color="$accent" />
          <Text
            color="$accent"
            fontSize={12}
            numberOfLines={1}
            textAlign="center"
          >
            {address}
          </Text>
        </XStack>
      )}
    </YStack>
  );
}

export default MapPreview;
