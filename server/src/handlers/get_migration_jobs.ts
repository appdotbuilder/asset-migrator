import { db } from '../db';
import { migrationJobsTable } from '../db/schema';
import { type MigrationJob, type GetMigrationJobsQuery } from '../schema';
import { and, eq, type SQL } from 'drizzle-orm';

export const getMigrationJobs = async (query?: GetMigrationJobsQuery): Promise<MigrationJob[]> => {
  try {
    // Build conditions array for optional filtering
    const conditions: SQL<unknown>[] = [];

    if (query?.status) {
      conditions.push(eq(migrationJobsTable.status, query.status));
    }

    if (query?.target_databricks_asset_type) {
      conditions.push(eq(migrationJobsTable.target_databricks_asset_type, query.target_databricks_asset_type));
    }

    // Build query with or without where clause
    const results = conditions.length > 0
      ? await db.select()
          .from(migrationJobsTable)
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .execute()
      : await db.select()
          .from(migrationJobsTable)
          .execute();

    // Convert the results to match the expected schema format
    return results.map(result => ({
      ...result,
      source_asset_ids: result.source_asset_ids as number[], // Cast JSONB to number array
      transformation_config: result.transformation_config as Record<string, any> | null,
      mapping_config: result.mapping_config as Record<string, any> | null
    }));
  } catch (error) {
    console.error('Failed to get migration jobs:', error);
    throw error;
  }
};