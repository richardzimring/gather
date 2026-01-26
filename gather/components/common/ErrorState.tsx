import { AlertCircle } from '@tamagui/lucide-icons'
import { Text, YStack, GetProps } from 'tamagui'

import { Button } from '../ui/Button'

export interface ErrorStateProps extends GetProps<typeof YStack> {
  /** Error title */
  title?: string
  /** Error message */
  message: string
  /** Retry callback */
  onRetry?: () => void
}

/**
 * Error state component for failed operations.
 */
export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  ...props
}: ErrorStateProps) {
  return (
    <YStack
      alignItems="center"
      justifyContent="center"
      padding="$6"
      gap="$3"
      {...props}
    >
      <YStack
        width={64}
        height={64}
        borderRadius={32}
        backgroundColor="$error"
        opacity={0.15}
        alignItems="center"
        justifyContent="center"
      >
        <AlertCircle size={32} color="$error" />
      </YStack>
      <Text fontSize={18} fontWeight="600" textAlign="center">
        {title}
      </Text>
      <Text color="$colorMuted" textAlign="center" maxWidth={280}>
        {message}
      </Text>
      {onRetry && (
        <Button variant="secondary" onPress={onRetry} marginTop="$2">
          Try Again
        </Button>
      )}
    </YStack>
  )
}
