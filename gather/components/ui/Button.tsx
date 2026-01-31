import { styled, Button as TamaguiButton, GetProps, Spinner, XStack } from 'tamagui'
import * as Haptics from 'expo-haptics'
import { Platform } from 'react-native'

/**
 * Base styled button with theme integration.
 */
const StyledButton = styled(TamaguiButton, {
  name: 'Button',
  borderRadius: '$3',
  fontWeight: '600',

  variants: {
    /** Visual style variants */
    variant: {
      primary: {
        backgroundColor: '$accent',
        color: '$white',
        pressStyle: {
          backgroundColor: '$accentPress',
        },
        hoverStyle: {
          backgroundColor: '$accentHover',
        },
      },
      secondary: {
        backgroundColor: '$backgroundHover',
        color: '$color',
        borderWidth: 1,
        borderColor: '$borderColor',
        pressStyle: {
          backgroundColor: '$backgroundPress',
        },
      },
      ghost: {
        backgroundColor: 'transparent',
        color: '$color',
        pressStyle: {
          backgroundColor: '$backgroundHover',
        },
      },
      danger: {
        backgroundColor: '$error',
        color: '$white',
        pressStyle: {
          opacity: 0.8,
        },
      },
    },

    /** Size variants */
    buttonSize: {
      sm: {
        height: 36,
        paddingHorizontal: '$3',
        fontSize: 14,
      },
      md: {
        height: 44,
        paddingHorizontal: '$4',
        fontSize: 16,
      },
      lg: {
        height: 52,
        paddingHorizontal: '$5',
        fontSize: 18,
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
})

export type ButtonProps = GetProps<typeof StyledButton> & {
  /** Whether to trigger haptic feedback on press */
  haptic?: boolean
  /** Whether the button is in a loading state */
  loading?: boolean
  /** Text to show while loading (optional, will show spinner if not provided) */
  loadingText?: string
}

/**
 * Button component with haptic feedback and loading state support.
 */
export function Button({
  haptic = true,
  loading = false,
  loadingText,
  onPress,
  disabled,
  children,
  variant,
  ...props
}: ButtonProps) {
  const handlePress = (event: Parameters<NonNullable<typeof onPress>>[0]) => {
    if (loading) return
    if (haptic && Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
    onPress?.(event)
  }

  // Determine spinner color based on variant
  const spinnerColor =
    variant === 'primary' || variant === 'danger' ? '$white' : '$color'

  return (
    <StyledButton
      onPress={handlePress}
      disabled={disabled || loading}
      variant={variant}
      {...props}
    >
      {loading ? (
        <XStack alignItems="center" justifyContent="center" gap="$2">
          <Spinner size="small" color={spinnerColor} />
          {loadingText && (
            <StyledButton.Text>{loadingText}</StyledButton.Text>
          )}
        </XStack>
      ) : (
        children
      )}
    </StyledButton>
  )
}

// Export styled version for cases where you don't need haptic
export { StyledButton as ButtonStyled }
