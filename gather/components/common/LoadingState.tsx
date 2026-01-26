import { Spinner, Text, YStack, GetProps } from 'tamagui'

export interface LoadingStateProps extends GetProps<typeof YStack> {
  /** Loading message to display */
  message?: string
  /** Size of the spinner */
  size?: 'small' | 'large'
}

/**
 * Loading state component with spinner and optional message.
 */
export function LoadingState({
  message = 'Loading...',
  size = 'large',
  ...props
}: LoadingStateProps) {
  return (
    <YStack
      flex={1}
      alignItems="center"
      justifyContent="center"
      padding="$6"
      gap="$3"
      {...props}
    >
      <Spinner size={size} color="$accent" />
      {message && (
        <Text color="$colorMuted" fontSize={14}>
          {message}
        </Text>
      )}
    </YStack>
  )
}
