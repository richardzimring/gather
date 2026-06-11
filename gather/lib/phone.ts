/** Light client-side check before the server normalizes to E.164. */
export function isPlausiblePhone(input: string): boolean {
  return input.trim().replace(/\D/g, '').length >= 10;
}
