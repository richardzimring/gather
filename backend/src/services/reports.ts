import { db, userReports } from '../db';

export const reportUser = async (
  reporterId: string,
  reportedId: string,
): Promise<{ success: boolean; message: string }> => {
  if (reporterId === reportedId) {
    return { success: false, message: 'Cannot report yourself' };
  }

  await db
    .insert(userReports)
    .values({ reporterId, reportedId })
    .onConflictDoNothing();

  return { success: true, message: 'User reported' };
};
