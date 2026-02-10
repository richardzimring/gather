import { Linking, Platform } from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import { YStack, Text } from "tamagui";

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
      {/* {!interactive && (
        <YStack
          position="absolute"
          bottom={0}
          left={0}
          right={0}
          padding="$2"
          backgroundColor="rgba(0,0,0,0.5)"
        >
          <Text color="white" fontSize={12} textAlign="center">
            Tap to open in Maps
          </Text>
        </YStack>
      )} */}
    </YStack>
  );
}

export default MapPreview;
