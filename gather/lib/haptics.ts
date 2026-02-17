import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

/**
 * Centralized haptic feedback utilities following Apple HIG best practices.
 * 
 * Impact Feedback:
 * - light: Subtle UI interactions (button taps, toggles, minor transitions)
 * - medium: Standard UI feedback, moderate importance actions
 * - heavy: Important actions, significant state changes
 * - rigid: Precise, defined interactions (picker stops, snapping)
 * - soft: Gentle, fluid interactions (smooth transitions)
 * 
 * Notification Feedback:
 * - success: Positive outcomes, task completion
 * - warning: Important alerts, confirmations needed
 * - error: Failed operations, invalid input
 * 
 * Selection Feedback:
 * - selection: Selection changes (picker wheels, segmented controls, discrete values)
 */
export const haptic = {
  // Impact feedback
  light: () => trigger(Haptics.ImpactFeedbackStyle.Light),
  medium: () => trigger(Haptics.ImpactFeedbackStyle.Medium),
  heavy: () => trigger(Haptics.ImpactFeedbackStyle.Heavy),
  rigid: () => trigger(Haptics.ImpactFeedbackStyle.Rigid),
  soft: () => trigger(Haptics.ImpactFeedbackStyle.Soft),

  // Notification feedback
  success: () => triggerNotification(Haptics.NotificationFeedbackType.Success),
  warning: () => triggerNotification(Haptics.NotificationFeedbackType.Warning),
  error: () => triggerNotification(Haptics.NotificationFeedbackType.Error),

  // Selection feedback
  selection: () => triggerSelection(),
};

function trigger(style: Haptics.ImpactFeedbackStyle) {
  if (Platform.OS === "ios") {
    Haptics.impactAsync(style);
  }
}

function triggerNotification(type: Haptics.NotificationFeedbackType) {
  if (Platform.OS === "ios") {
    Haptics.notificationAsync(type);
  }
}

function triggerSelection() {
  if (Platform.OS === "ios") {
    Haptics.selectionAsync();
  }
}
