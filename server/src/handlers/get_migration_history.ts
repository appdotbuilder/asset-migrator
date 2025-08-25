import { db } from '../db';
import { migrationHistoryTable } from '../db/schema';
import { type MigrationHistory } from '../schema';
import { eq, asc } from 'drizzle-orm';

export const getMigrationHistory = async (migrationJobId: number): Promise<MigrationHistory[]> => {
  try {
    // Query migration history for the specific job ID, ordered chronologically
    const results = await db.select()
      .from(migrationHistoryTable)
      .where(eq(migrationHistoryTable.migration_job_id, migrationJobId))
      .orderBy(asc(migrationHistoryTable.created_at))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch migration history:', error);
    throw error;
  }
};