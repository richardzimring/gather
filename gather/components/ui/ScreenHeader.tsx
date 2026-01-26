import { ChevronLeft } from '@tamagui/lucide-icons'
import { router } from 'expo-router'
import { H1, XStack, YStack, GetProps } from 'tamagui'

import { Button } from './Button'

export interface ScreenHeaderProps extends GetProps<typeof XStack> {
  /** Main title of the screen */
  title: string
  /** Subtitle text (optional) */
  subtitle?: string
  /** Whether to show a back button */
  showBack?: boolean
  /** Custom back button handler (defaults to router.back()) */
  onBack?: () => void
  /** Left action element (replaces back button) */
  leftAction?: React.ReactNode
  /** Right action element(s) */
  rightAction?: React.ReactNode
  /** Title alignment */
  titleAlign?: 'left' | 'center'
}

/**
 * Reusable screen header component for consistent navigation patterns.
 *
 * Variants:
 * - Simple: Just title (titleAlign="left", no actions)
 * - With back: Back button + title
 * - With actions: Back button + title + right action(s)
 * - Centered: Centered title with optional back and actions
 */
export function ScreenHeader({
  title,
  subtitle,
  showBack = false,
  onBack,
  leftAction,
  rightAction,
  titleAlign = 'left',
  ...props
}: ScreenHeaderProps) {
  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      router.back()
    }
  }

  const renderLeftSection = () => {
    if (leftAction) {
      return leftAction
    }
    if (showBack) {
      return (
        <Button
          variant="ghost"
          buttonSize="sm"
          circular
          icon={<ChevronLeft size={24} />}
          onPress={handleBack}
        />
      )
    }
    return null
  }

  const leftElement = renderLeftSection()

  // Center alignment with back button
  if (titleAlign === 'center') {
    return (
      <XStack
        alignItems="center"
        justifyContent="space-between"
        marginBottom="$4"
        {...props}
      >
        <YStack width={44} alignItems="flex-start">
          {leftElement}
        </YStack>
        <YStack flex={1} alignItems="center">
          <H1 fontSize={20} fontWeight="700" numberOfLines={1}>
            {title}
          </H1>
          {subtitle && (
            <H1 fontSize={14} color="$colorMuted" fontWeight="400">
              {subtitle}
            </H1>
          )}
        </YStack>
        <YStack width={44} alignItems="flex-end">
          {rightAction}
        </YStack>
      </XStack>
    )
  }

  // Left alignment (default)
  return (
    <XStack
      alignItems="center"
      gap="$3"
      marginBottom="$4"
      {...props}
    >
      {leftElement}
      <YStack flex={1}>
        <H1 fontSize={24} fontWeight="700" numberOfLines={1}>
          {title}
        </H1>
        {subtitle && (
          <H1 fontSize={14} color="$colorMuted" fontWeight="400" marginTop="$1">
            {subtitle}
          </H1>
        )}
      </YStack>
      {rightAction}
    </XStack>
  )
}

// Pre-configured variants for common use cases

/**
 * Simple header with just a title (no back button)
 */
export function SimpleHeader({
  title,
  rightAction,
  ...props
}: Omit<ScreenHeaderProps, 'showBack' | 'onBack' | 'leftAction'>) {
  return (
    <ScreenHeader
      title={title}
      rightAction={rightAction}
      showBack={false}
      {...props}
    />
  )
}

/**
 * Header with back button (default navigation header)
 */
export function BackHeader({
  title,
  subtitle,
  onBack,
  rightAction,
  ...props
}: Omit<ScreenHeaderProps, 'showBack' | 'leftAction'>) {
  return (
    <ScreenHeader
      title={title}
      subtitle={subtitle}
      onBack={onBack}
      rightAction={rightAction}
      showBack
      {...props}
    />
  )
}

/**
 * Header with back button (for modals/forms)
 */
export function CancelHeader({
  title,
  subtitle,
  onCancel,
  rightAction,
  ...props
}: Omit<ScreenHeaderProps, 'showBack' | 'onBack' | 'leftAction'> & {
  onCancel?: () => void
}) {
  return (
    <ScreenHeader
      title={title}
      subtitle={subtitle}
      onBack={onCancel}
      rightAction={rightAction}
      showBack
      {...props}
    />
  )
}
