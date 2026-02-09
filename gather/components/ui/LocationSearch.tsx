import { useState, useCallback } from 'react'
import { MapPin, X, Search } from '@tamagui/lucide-icons'
import { Input, XStack, YStack, Text, ScrollView, Spinner } from 'tamagui'
import debounce from 'lodash.debounce'

export interface PlaceResult {
  placeId: string
  name: string
  address: string
}

interface LocationSearchProps {
  value?: string
  onSelect: (place: PlaceResult | null) => void
  placeholder?: string
}

/**
 * Location search component with autocomplete
 * Note: This is a simplified version. For production, integrate with Google Places API.
 */
export function LocationSearch({ value, onSelect, placeholder = 'Search for a place...' }: LocationSearchProps) {
  const [query, setQuery] = useState(value ?? '')
  const [results, setResults] = useState<PlaceResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null)

  // Simulated search - replace with actual Google Places API call
  const searchPlaces = useCallback(
    debounce(async (searchQuery: string) => {
      if (!searchQuery || searchQuery.length < 2) {
        setResults([])
        setIsSearching(false)
        return
      }

      setIsSearching(true)
      
      // TODO: Replace with actual Google Places API call
      // For now, return empty results to show the UI pattern
      // When implementing, use:
      // const response = await fetch(`https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(searchQuery)}&key=${GOOGLE_PLACES_API_KEY}`)
      
      // Simulated delay
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Simulated results for demo
      const mockResults: PlaceResult[] = searchQuery.toLowerCase().includes('coffee') ? [
        { placeId: '1', name: 'Spyhouse Coffee', address: '945 Broadway St NE, Minneapolis, MN' },
        { placeId: '2', name: 'Dogwood Coffee Co', address: '825 Carleton St, St Paul, MN' },
        { placeId: '3', name: 'Five Watt Coffee', address: '3745 Nicollet Ave, Minneapolis, MN' },
      ] : searchQuery.toLowerCase().includes('gym') ? [
        { placeId: '4', name: 'Life Time Fitness', address: '1400 Nicollet Mall, Minneapolis, MN' },
        { placeId: '5', name: 'YWCA Minneapolis', address: '1130 Nicollet Mall, Minneapolis, MN' },
      ] : []
      
      setResults(mockResults)
      setIsSearching(false)
    }, 300),
    []
  )

  const handleQueryChange = (text: string) => {
    setQuery(text)
    setShowResults(true)
    setSelectedPlace(null)
    searchPlaces(text)
  }

  const handleSelectPlace = (place: PlaceResult) => {
    setSelectedPlace(place)
    setQuery(place.name)
    setShowResults(false)
    setResults([])
    onSelect(place)
  }

  const handleClear = () => {
    setQuery('')
    setSelectedPlace(null)
    setResults([])
    setShowResults(false)
    onSelect(null)
  }

  return (
    <YStack gap="$2" position="relative">
      <XStack
        alignItems="center"
        backgroundColor="$backgroundHover"
        borderColor="$borderColor"
        borderWidth={1}
        borderRadius="$3"
        paddingHorizontal="$3"
      >
        <MapPin size={18} color="$colorMuted" />
        <Input
          flex={1}
          placeholder={placeholder}
          placeholderTextColor="$colorMuted"
          value={query}
          onChangeText={handleQueryChange}
          onFocus={() => query.length >= 2 && setShowResults(true)}
          backgroundColor="transparent"
          borderWidth={0}
          height={48}
        />
        {isSearching && <Spinner size="small" />}
        {query && !isSearching && (
          <X
            size={18}
            color="$colorMuted"
            onPress={handleClear}
          />
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
                pressStyle={{ backgroundColor: '$backgroundHover' }}
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

      {showResults && query.length >= 2 && results.length === 0 && !isSearching && (
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

      {selectedPlace && (
        <XStack
          backgroundColor="$accentSubtle"
          padding="$2"
          borderRadius="$2"
          alignItems="center"
          gap="$2"
        >
          <MapPin size={14} color="$accent" />
          <Text color="$accent" fontSize={12} flex={1} numberOfLines={1}>
            {selectedPlace.address}
          </Text>
        </XStack>
      )}
    </YStack>
  )
}

export default LocationSearch
