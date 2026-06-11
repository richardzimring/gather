import { Search } from '@tamagui/lucide-icons';
import {
  GlassView,
  isLiquidGlassAvailable,
  isGlassEffectAPIAvailable,
} from 'expo-glass-effect';
import { StyleSheet } from 'react-native';
import { Input, XStack } from 'tamagui';

export interface SearchBarProps {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
}

/**
 * Rounded search field with Liquid Glass effect.
 * Falls back to a translucent background on platforms below iOS 26.
 */
export function SearchBar({
  placeholder,
  value,
  onChangeText,
}: SearchBarProps) {
  const useGlass = isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

  const field = (
    <XStack alignItems="center" paddingHorizontal="$3" height={36}>
      <Search size={16} color="$colorMuted" />
      <Input
        flex={1}
        placeholder={placeholder}
        placeholderTextColor="$colorMuted"
        backgroundColor="transparent"
        borderWidth={0}
        fontSize={14}
        value={value}
        onChangeText={onChangeText}
      />
    </XStack>
  );

  return useGlass ? (
    <GlassView style={styles.glass}>{field}</GlassView>
  ) : (
    <XStack
      backgroundColor="$backgroundHover"
      borderRadius="$2"
      overflow="hidden"
    >
      {field}
    </XStack>
  );
}

const styles = StyleSheet.create({
  glass: {
    borderRadius: 12,
    overflow: 'hidden',
  },
});
