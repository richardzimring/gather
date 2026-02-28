import { useColorScheme } from 'react-native';
import { Switch } from 'tamagui';

export interface ToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: '$2' | '$3';
}

export function Toggle({
  checked,
  onCheckedChange,
  disabled,
  size = '$3',
}: ToggleProps) {
  const colorScheme = useColorScheme();
  const isLightMode = colorScheme === 'light';

  return (
    <Switch
      size={size}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      backgroundColor={
        checked ? '$primary' : isLightMode ? '$borderColor' : '$backgroundHover'
      }
      borderColor="transparent"
    >
      <Switch.Thumb
        animation="quick"
        backgroundColor={
          !isLightMode && checked ? '$primaryForeground' : '$white'
        }
      />
    </Switch>
  );
}
