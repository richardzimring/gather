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
  return (
    <Switch
      size={size}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      backgroundColor={checked ? '$primary' : '$backgroundHover'}
      borderColor="transparent"
    >
      <Switch.Thumb
        animation="quick"
        backgroundColor={checked ? '$primaryForeground' : '$color'}
      />
    </Switch>
  );
}
