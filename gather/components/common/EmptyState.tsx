import { Text, YStack, GetProps } from 'tamagui'

export interface EmptyStateProps extends GetProps<typeof YStack> {
  /** Icon or illustration to display */
  icon?: React.ReactNode
  /** Main title */
  title: string
  /** Description text */
  description?: string
  /** Action button or element */
  action?: React.ReactNode
}

/**
 * Empty state component for lists and sections with no data.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  ...props
}: EmptyStateProps) {
  return (
    <YStack
      alignItems="center"
      justifyContent="center"
      padding="$6"
      gap="$3"
      {...props}
    >
      {icon && <YStack marginBottom="$2">{icon}</YStack>}
      <Text fontSize={18} fontWeight="600" textAlign="center">
        {title}
      </Text>
      {description && (
        <Text color="$colorMuted" textAlign="center" maxWidth={280}>
          {description}
        </Text>
      )}
      {action && <YStack marginTop="$2">{action}</YStack>}
    </YStack>
  )
}
