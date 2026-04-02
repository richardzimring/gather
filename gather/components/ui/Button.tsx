import { styled, Button as TamaguiButton, GetProps, useTheme } from 'tamagui';
import { Spinner } from './Spinner';
import { haptic } from '../../lib/haptics';

/**
 * Base styled button with theme integration.
 * shadcn Mira style - compact, neutral colors
 */
const StyledButton = styled(TamaguiButton, {
  name: 'Button',
  borderRadius: '$2',
  fontWeight: '500',

  variants: {
    /** Visual style variants (shadcn Mira - neutral primary) */
    variant: {
      primary: {
        backgroundColor: '$primary',
        color: '$primaryForeground',
        pressStyle: {
          backgroundColor: '$primaryPress',
        },
        hoverStyle: {
          backgroundColor: '$primaryHover',
        },
      },
      secondary: {
        backgroundColor: '$secondary',
        color: '$secondaryForeground',
        borderWidth: 1,
        borderColor: '$borderColor',
        pressStyle: {
          backgroundColor: '$secondaryPress',
        },
        hoverStyle: {
          backgroundColor: '$secondaryHover',
        },
      },
      outline: {
        backgroundColor: 'transparent',
        color: '$color',
        borderWidth: 1,
        borderColor: '$borderColor',
        pressStyle: {
          backgroundColor: '$backgroundHover',
        },
        hoverStyle: {
          backgroundColor: '$backgroundHover',
        },
      },
      ghost: {
        backgroundColor: 'transparent',
        color: '$color',
        pressStyle: {
          backgroundColor: '$backgroundHover',
        },
        hoverStyle: {
          backgroundColor: '$backgroundHover',
        },
      },
      destructive: {
        backgroundColor: '$destructive',
        color: '$destructiveForeground',
        pressStyle: {
          backgroundColor: '$destructive',
          opacity: 0.9,
        },
      },
    },

    /** Size variants (Mira style - compact) */
    buttonSize: {
      sm: {
        height: 32,
        paddingHorizontal: '$3',
        fontSize: 13,
      },
      md: {
        height: 36,
        paddingHorizontal: '$4',
        fontSize: 14,
      },
      lg: {
        height: 44,
        paddingHorizontal: '$5',
        fontSize: 15,
      },
    },

    /** Full width button */
    fullWidth: {
      true: {
        width: '100%',
      },
    },
  } as const,

  defaultVariants: {
    variant: 'primary',
    buttonSize: 'md',
  },
});

export type ButtonProps = GetProps<typeof StyledButton> & {
  /** Whether to trigger haptic feedback on press */
  haptic?: boolean;
  /** Override haptic intensity (defaults based on variant: primary=medium, destructive=heavy, others=light) */
  hapticStyle?: 'light' | 'medium' | 'heavy';
  /** Whether the button is in a loading state */
  loading?: boolean;
  /** Text to show while loading (optional, will show spinner if not provided) */
  loadingText?: string;
};

/**
 * Button component with haptic feedback and loading state support.
 */
export function Button({
  haptic: enableHaptic = true,
  hapticStyle,
  loading = false,
  loadingText,
  onPress,
  disabled,
  children,
  variant,
  icon,
  ...props
}: ButtonProps) {
  const theme = useTheme();

  const handlePress = (event: Parameters<NonNullable<typeof onPress>>[0]) => {
    if (loading) return;

    if (enableHaptic) {
      // Determine haptic intensity based on variant
      const intensity =
        hapticStyle ||
        (variant === 'destructive'
          ? 'heavy'
          : variant === 'primary'
            ? 'medium'
            : 'light');

      if (intensity === 'heavy') haptic.heavy();
      else if (intensity === 'medium') haptic.medium();
      else haptic.light();
    }

    onPress?.(event);
  };

  // Determine spinner color based on variant
  const spinnerColor =
    variant === 'primary' || variant === 'destructive'
      ? theme.primaryForeground.val
      : theme.color.val;

  const isDisabled = (disabled || loading) ?? false;

  return (
    <StyledButton
      onPress={handlePress}
      disabled={isDisabled}
      variant={variant}
      opacity={isDisabled && !loading ? 0.5 : 1}
      icon={loading ? <Spinner size="small" color={spinnerColor} /> : icon}
      {...props}
    >
      {loading
        ? icon
          ? (loadingText ?? children) // has icon: keep text, spinner replaces icon
          : (loadingText ?? null) // no icon: show loadingText or just spinner
        : children}
    </StyledButton>
  );
}
