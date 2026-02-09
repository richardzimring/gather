import { styled, YStack, GetProps } from 'tamagui'

/**
 * Card component with themed styling.
 * shadcn Mira style - compact, smaller radii
 * Automatically uses the Card sub-theme for proper background colors.
 */
export const Card = styled(YStack, {
  name: 'Card',
  backgroundColor: '$background',
  borderRadius: '$2',
  borderWidth: 1,
  borderColor: '$borderColor',
  padding: '$3',

  variants: {
    /** Elevated card with slightly different background */
    elevated: {
      true: {
        backgroundColor: '$backgroundHover',
      },
    },

    /** Pressable card with press animation */
    pressable: {
      true: {
        pressStyle: {
          backgroundColor: '$backgroundPress',
          scale: 0.99,
        },
        cursor: 'pointer',
      },
    },

    /** Outlined card style for pending/proposal events */
    outlined: {
      true: {
        backgroundColor: 'transparent',
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: '$borderColorHover',
      },
    },

    /** Size variants (Mira style - compact) */
    cardSize: {
      sm: {
        padding: '$2',
        borderRadius: '$1',
      },
      md: {
        padding: '$3',
        borderRadius: '$2',
      },
      lg: {
        padding: '$4',
        borderRadius: '$3',
      },
    },
  } as const,

  defaultVariants: {
    cardSize: 'md',
  },
})

export type CardProps = GetProps<typeof Card>
