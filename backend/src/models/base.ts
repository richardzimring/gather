import * as db from '../services/dynamodb';

/**
 * Base interface for all DynamoDB records
 */
export interface DynamoRecord {
  pk: string;
  sk: string;
  gsi1pk?: string;
  gsi1sk?: string;
}

/**
 * Base class for DynamoDB models providing common functionality
 */
export abstract class BaseModel<T extends DynamoRecord> {
  protected record: T;

  constructor(record: T) {
    this.record = record;
  }

  /**
   * Get the primary key
   */
  get pk(): string {
    return this.record.pk;
  }

  /**
   * Get the sort key
   */
  get sk(): string {
    return this.record.sk;
  }

  /**
   * Save the record to DynamoDB
   */
  async save(): Promise<void> {
    await db.putItem(this.record);
  }

  /**
   * Delete the record from DynamoDB
   */
  async delete(): Promise<void> {
    await db.deleteItem(this.record.pk, this.record.sk);
  }

  /**
   * Convert to JSON-safe object (strips DynamoDB keys)
   */
  abstract toJSON(): unknown;

  /**
   * Get the raw DynamoDB record
   */
  toRecord(): T {
    return { ...this.record };
  }
}

/**
 * Helper to strip DynamoDB-specific keys from a record
 */
export const stripDynamoKeys = <T extends DynamoRecord>(
  record: T,
): Omit<T, 'pk' | 'sk' | 'gsi1pk' | 'gsi1sk'> => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { pk, sk, gsi1pk, gsi1sk, ...rest } = record;
  return rest as Omit<T, 'pk' | 'sk' | 'gsi1pk' | 'gsi1sk'>;
};

// Re-export db for convenience
export { db };
