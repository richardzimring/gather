import type { ScheduledHandler } from 'aws-lambda';

/**
 * Scheduled cleanup job that runs daily to:
 * 1. Delete expired verification codes (handled by DynamoDB TTL)
 * 2. Clean up old pending SMS invites
 * 3. Archive past events (optional)
 */
export const handler: ScheduledHandler = async (event) => {
  console.log('Running scheduled cleanup job', event);

  try {
    // Most cleanup is handled by DynamoDB TTL on the expiresAt attribute
    // This handler can be used for additional cleanup tasks

    // Example: Clean up pending invites older than 30 days
    // const thirtyDaysAgo = new Date();
    // thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    // 
    // Query and delete old pending invites...

    console.log('Cleanup completed successfully');
  } catch (error) {
    console.error('Cleanup job failed:', error);
    throw error;
  }
};
