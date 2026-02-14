import {
  styled,
  Button as TamaguiButton,
  GetProps,
  Spinner,
  XStack,
  Text,
} from "tamagui";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

/**
 * Base styled button with theme integration.
 * shadcn Mira style - compact, neutral colors
 */
const StyledButton = styled(TamaguiButton, {
  name: "Button",
  borderRadius: "$2",
  fontWeight: "500",

  variants: {
    /** Visual style variants (shadcn Mira - neutral primary) */
    variant: {
      primary: {
        backgroundColor: "$primary",
        color: "$primaryForeground",
        pressStyle: {
          backgroundColor: "$primaryPress",
        },
        hoverStyle: {
          backgroundColor: "$primaryHover",
        },
      },
      secondary: {
        backgroundColor: "$secondary",
        color: "$secondaryForeground",
        borderWidth: 1,
        borderColor: "$borderColor",
        pressStyle: {
          backgroundColor: "$secondaryPress",
        },
        hoverStyle: {
          backgroundColor: "$secondaryHover",
        },
      },
      outline: {
        backgroundColor: "transparent",
        color: "$color",
        borderWidth: 1,
        borderColor: "$borderColor",
        pressStyle: {
          backgroundColor: "$backgroundHover",
        },
        hoverStyle: {
          backgroundColor: "$backgroundHover",
        },
      },
      ghost: {
        backgroundColor: "transparent",
        color: "$color",
        pressStyle: {
          backgroundColor: "$backgroundHover",
        },
        hoverStyle: {
          backgroundColor: "$backgroundHover",
        },
      },
      destructive: {
        backgroundColor: "$destructive",
        color: "$destructiveForeground",
        pressStyle: {
          opacity: 0.9,
        },
      },
    },

    /** Size variants (Mira style - compact) */
    buttonSize: {
      sm: {
        height: 32,
        paddingHorizontal: "$3",
        fontSize: 13,
      },
      md: {
        height: 36,
        paddingHorizontal: "$4",
        fontSize: 14,
      },
      lg: {
        height: 44,
        paddingHorizontal: "$5",
        fontSize: 15,
      },
    },

    /** Full width button */
    fullWidth: {
      true: {
        width: "100%",
      },
    },
  } as const,

  defaultVariants: {
    variant: "primary",
    buttonSize: "md",
  },
});

export type ButtonProps = GetProps<typeof StyledButton> & {
  /** Whether to trigger haptic feedback on press */
  haptic?: boolean;
  /** Whether the button is in a loading state */
  loading?: boolean;
  /** Text to show while loading (optional, will show spinner if not provided) */
  loadingText?: string;
};

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
    if (loading) return;
    if (haptic && Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.(event);
  };

  // Determine spinner color based on variant
  const spinnerColor =
    variant === "primary" || variant === "destructive"
      ? "$primaryForeground"
      : "$color";

  const isDisabled = (disabled || loading) ?? false;

  return (
    <StyledButton
      onPress={handlePress}
      disabled={isDisabled}
      variant={variant}
      opacity={isDisabled && !loading ? 0.5 : 1}
      {...props}
    >
      {loading ? (
        <XStack alignItems="center" justifyContent="center" gap="$2">
          <Spinner size="small" color={spinnerColor} />
          {loadingText && <Text>{loadingText}</Text>}
        </XStack>
      ) : (
        children
      )}
    </StyledButton>
  );
}

// Export styled version for cases where you don't need haptic
export { StyledButton as ButtonStyled };
