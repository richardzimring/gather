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
 * shadcn Mira style - compact spacing
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
      padding="$5"
      gap="$2"
      {...props}
    >
      {icon && <YStack marginBottom="$1">{icon}</YStack>}
      <Text fontSize={15} fontWeight="500" textAlign="center">
        {title}
      </Text>
      {description && (
        <Text color="$colorMuted" fontSize={13} textAlign="center" maxWidth={260}>
          {description}
        </Text>
      )}
      {action && <YStack marginTop="$2">{action}</YStack>}
    </YStack>
  )
}
