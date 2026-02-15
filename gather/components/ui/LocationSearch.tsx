import { useState, useMemo, useCallback, useRef } from "react";
import { MapPin, X, Search } from "@tamagui/lucide-icons";
import { Input, XStack, YStack, Text, ScrollView, Spinner } from "tamagui";
import * as Location from "expo-location";
import debounce from "lodash.debounce";

const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;

// Default search radius in meters (50km)
const DEFAULT_SEARCH_RADIUS = 50000;

export interface PlaceResult {
  placeId: string;
  name: string;
  address: string;
  latitude?: string;
  longitude?: string;
}

interface AutocompletePrediction {
  place_id: string;
  structured_formatting: {
    main_text: string;
    secondary_text?: string;
  };
  description: string;
}

interface UserLocation {
  latitude: number;
  longitude: number;
}

interface LocationSearchProps {
  value?: string;
  onSelect: (place: PlaceResult | null) => void;
  placeholder?: string;
}

/**
 * Location search component with Google Places autocomplete
 * Uses user's current location to bias search results
 */
export function LocationSearch({
  value,
  onSelect,
  placeholder = "Search for a place...",
}: LocationSearchProps) {
  const [query, setQuery] = useState(value ?? "");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const userLocationRef = useRef<UserLocation | null>(null);
  const locationRequestedRef = useRef(false);

  // Request location permission and get current location (called on user interaction)
  const requestLocationIfNeeded = useCallback(async () => {
    if (locationRequestedRef.current || userLocationRef.current) return;
    locationRequestedRef.current = true;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log(
          "Location permission not granted, search results will not be location-biased",
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      userLocationRef.current = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (error) {
      console.log("Could not get user location:", error);
    }
  }, []);

  // Fetch place details to get coordinates
  const fetchPlaceDetails = useCallback(
    async (
      placeId: string,
    ): Promise<{ latitude: string; longitude: string } | null> => {
      if (!GOOGLE_PLACES_API_KEY) return null;

      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry&key=${GOOGLE_PLACES_API_KEY}`,
        );
        const data = await response.json();

        if (data.status === "OK" && data.result?.geometry?.location) {
          return {
            latitude: String(data.result.geometry.location.lat),
            longitude: String(data.result.geometry.location.lng),
          };
        }
      } catch (error) {
        console.error("Error fetching place details:", error);
      }
      return null;
    },
    [],
  );

  // Search places using Google Places Autocomplete API
  const searchPlaces = useMemo(
    () =>
      debounce(async (searchQuery: string) => {
        if (!searchQuery || searchQuery.length < 2) {
          setResults([]);
          setIsSearching(false);
          return;
        }

        if (!GOOGLE_PLACES_API_KEY) {
          console.warn("Google Places API key not configured");
          setResults([]);
          setIsSearching(false);
          return;
        }

        setIsSearching(true);

        try {
          // Build the API URL with optional location bias
          let apiUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(searchQuery)}&key=${GOOGLE_PLACES_API_KEY}`;

          // Add location bias if user location is available
          if (userLocationRef.current) {
            const { latitude, longitude } = userLocationRef.current;
            apiUrl += `&location=${latitude},${longitude}&radius=${DEFAULT_SEARCH_RADIUS}`;
          }

          const response = await fetch(apiUrl);
          const data = await response.json();

          if (data.status === "OK" && data.predictions) {
            const places: PlaceResult[] = data.predictions.map(
              (prediction: AutocompletePrediction) => ({
                placeId: prediction.place_id,
                name: prediction.structured_formatting.main_text,
                address:
                  prediction.structured_formatting.secondary_text ||
                  prediction.description,
              }),
            );
            setResults(places);
          } else {
            setResults([]);
          }
        } catch (error) {
          console.error("Error searching places:", error);
          setResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 300),
    [],
  );

  const handleQueryChange = (text: string) => {
    setQuery(text);
    setShowResults(true);
    setSelectedPlace(null);
    searchPlaces(text);
  };

  const handleSelectPlace = async (place: PlaceResult) => {
    setQuery(place.name);
    setShowResults(false);
    setResults([]);
    setIsSearching(true);

    // Fetch coordinates for the selected place
    const coords = await fetchPlaceDetails(place.placeId);
    const placeWithCoords: PlaceResult = {
      ...place,
      latitude: coords?.latitude,
      longitude: coords?.longitude,
    };

    setSelectedPlace(placeWithCoords);
    setIsSearching(false);
    onSelect(placeWithCoords);
  };

  const handleClear = () => {
    setQuery("");
    setSelectedPlace(null);
    setResults([]);
    setShowResults(false);
    onSelect(null);
  };

  return (
    <YStack gap="$2" position="relative">
      <XStack
        alignItems="center"
        backgroundColor="$backgroundHover"
        borderColor="$borderColor"
        borderWidth={1}
        borderRadius="$3"
        paddingRight="$3"
      >
        <Input
          flex={1}
          placeholder={placeholder}
          placeholderTextColor="$colorMuted"
          value={query}
          onChangeText={handleQueryChange}
          onFocus={() => {
            requestLocationIfNeeded();
            if (query.length >= 2) setShowResults(true);
          }}
          backgroundColor="transparent"
          borderWidth={0}
          height={48}
        />
        {isSearching && <Spinner size="small" />}
        {query && !isSearching && (
          <X size={18} color="$colorMuted" onPress={handleClear} />
        )}
      </XStack>

      {showResults && results.length > 0 && (
        <YStack
          position="absolute"
          top={52}
          left={0}
          right={0}
          backgroundColor="$background"
          borderColor="$borderColor"
          borderWidth={1}
          borderRadius="$3"
          zIndex={1000}
          maxHeight={200}
          overflow="hidden"
        >
          <ScrollView>
            {results.map((place, index) => (
              <XStack
                key={place.placeId}
                padding="$3"
                gap="$3"
                alignItems="center"
                borderBottomWidth={index < results.length - 1 ? 1 : 0}
                borderBottomColor="$borderColor"
                pressStyle={{ backgroundColor: "$backgroundHover" }}
                onPress={() => handleSelectPlace(place)}
              >
                <MapPin size={16} color="$accent" />
                <YStack flex={1}>
                  <Text fontWeight="500" numberOfLines={1}>
                    {place.name}
                  </Text>
                  <Text color="$colorMuted" fontSize={12} numberOfLines={1}>
                    {place.address}
                  </Text>
                </YStack>
              </XStack>
            ))}
          </ScrollView>
        </YStack>
      )}

      {showResults &&
        query.length >= 2 &&
        results.length === 0 &&
        !isSearching && (
          <YStack
            position="absolute"
            top={52}
            left={0}
            right={0}
            backgroundColor="$background"
            borderColor="$borderColor"
            borderWidth={1}
            borderRadius="$3"
            padding="$3"
            zIndex={1000}
          >
            <XStack alignItems="center" gap="$2" justifyContent="center">
              <Search size={16} color="$colorMuted" />
              <Text color="$colorMuted" fontSize={13}>
                No places found. Try a different search.
              </Text>
            </XStack>
          </YStack>
        )}
    </YStack>
  );
}

export default LocationSearch;
