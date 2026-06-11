import { parsePhoneNumberFromString } from 'libphonenumber-js';

/**
 * Normalize a user-supplied phone number to E.164 format (e.g. +14155550123).
 *
 * Phone numbers are self-reported and unverified. We default to US parsing when
 * no country code is present, since the app is US-focused. Returns null when the
 * input cannot be parsed into a valid number so callers can reject it.
 */
export function normalizePhone(
  input: string,
  defaultCountry: 'US' = 'US',
): string | null {
  if (!input || typeof input !== 'string') return null;
  try {
    const parsed = parsePhoneNumberFromString(input.trim(), defaultCountry);
    if (!parsed || !parsed.isValid()) return null;
    return parsed.number;
  } catch {
    return null;
  }
}

/**
 * Normalize a batch of phone numbers, returning a de-duplicated list of valid
 * E.164 numbers. Invalid entries are silently dropped.
 */
export function normalizePhones(
  inputs: string[],
  defaultCountry: 'US' = 'US',
): string[] {
  const set = new Set<string>();
  for (const input of inputs) {
    const normalized = normalizePhone(input, defaultCountry);
    if (normalized) set.add(normalized);
  }
  return [...set];
}
