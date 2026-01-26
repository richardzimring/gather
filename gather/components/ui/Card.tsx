import { styled, YStack, GetProps } from 'tamagui'

/**
 * Card component with themed styling.
 * Automatically uses the Card sub-theme for proper background colors.
 */
export const Card = styled(YStack, {
  name: 'Card',
  backgroundColor: '$background',
  borderRadius: '$4',
  borderWidth: 1,
  borderColor: '$borderColor',
  padding: '$4',

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
          scale: 0.98,
        },
        cursor: 'pointer',
      },
    },

    /** Size variants */
    cardSize: {
      sm: {
        padding: '$2',
        borderRadius: '$3',
      },
      md: {
        padding: '$4',
        borderRadius: '$4',
      },
      lg: {
        padding: '$5',
        borderRadius: '$5',
      },
    },
  } as const,

  defaultVariants: {
    cardSize: 'md',
  },
})

export type CardProps = GetProps<typeof Card>
