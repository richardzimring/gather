import { styled, Text, XStack, GetProps } from 'tamagui';

/**
 * Badge text component with proper styling
 */
const BadgeText = styled(Text, {
  name: 'BadgeText',
  fontSize: 11,
  fontWeight: '600',
});

/**
 * Badge component for labels and status indicators.
 * Supports multiple color variants for different contexts.
 */
export const Badge = styled(XStack, {
  name: 'Badge',
  paddingHorizontal: '$2',
  paddingVertical: 2,
  borderRadius: '$3',
  alignItems: 'center',
  justifyContent: 'center',

  variants: {
    /** Color variant for different badge types */
    variant: {
      host: {
        backgroundColor: '$purpleSubtle',
      },
      success: {
        backgroundColor: '$successSubtle',
      },
      warning: {
        backgroundColor: '$warningSubtle',
      },
      error: {
        backgroundColor: '$destructiveSubtle',
      },
      muted: {
        backgroundColor: '$backgroundHover',
      },
    },
  } as const,

  defaultVariants: {
    variant: 'muted',
  },
});

/**
 * Convenience component that combines Badge container with text
 */
export function BadgeLabel({
  children,
  variant = 'muted',
  ...props
}: GetProps<typeof Badge> & { children: string }) {
  const textColor =
    {
      host: '$purple',
      success: '$success',
      warning: '$warning',
      error: '$error',
      muted: '$colorMuted',
    }[variant as string] ?? '$colorMuted';

  return (
    <Badge variant={variant} {...props}>
      <BadgeText color={textColor}>{children}</BadgeText>
    </Badge>
  );
}

export type BadgeProps = GetProps<typeof Badge>;
