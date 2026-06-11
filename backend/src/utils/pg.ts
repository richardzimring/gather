const PG_UNIQUE_VIOLATION = '23505';

const hasPgCode = (value: unknown, code: string): boolean =>
  typeof value === 'object' &&
  value !== null &&
  'code' in value &&
  (value as { code?: string }).code === code;

/** True when a thrown error is a Postgres unique-violation (23505). */
export const isUniqueViolation = (error: unknown): boolean => {
  if (hasPgCode(error, PG_UNIQUE_VIOLATION)) return true;
  if (
    typeof error === 'object' &&
    error !== null &&
    'cause' in error &&
    hasPgCode((error as { cause?: unknown }).cause, PG_UNIQUE_VIOLATION)
  ) {
    return true;
  }
  return false;
};
