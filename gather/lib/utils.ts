/**
 * Get the device's current timezone
 * @returns IANA timezone string (e.g., "America/Chicago")
 */
export const getDeviceTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch (error) {
    console.error('Failed to get device timezone:', error)
    return 'America/New_York' // fallback
  }
}
