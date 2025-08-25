import { db } from '../db';
import { migrationJobsTable, assetsTable } from '../db/schema';
import { type CreateMigrationJobInput, type MigrationJob } from '../schema';
import { eq, inArray } from 'drizzle-orm';

export const createMigrationJob = async (input: CreateMigrationJobInput): Promise<MigrationJob> => {
  try {
    // Validate that all source assets exist
    const existingAssets = await db.select()
      .from(assetsTable)
      .where(inArray(assetsTable.id, input.source_asset_ids))
      .execute();

    if (existingAssets.length !== input.source_asset_ids.length) {
      const foundIds = existingAssets.map(asset => asset.id);
      const missingIds = input.source_asset_ids.filter(id => !foundIds.includes(id));
      throw new Error(`The following asset IDs do not exist: ${missingIds.join(', ')}`);
    }

    // Insert migration job record
    const result = await db.insert(migrationJobsTable)
      .values({
        name: input.name,
        description: input.description,
        source_asset_ids: input.source_asset_ids, // Array is stored as JSONB
        target_databricks_asset_type: input.target_databricks_asset_type,
        transformation_config: input.transformation_config,
        mapping_config: input.mapping_config
        // status defaults to 'pending'
        // progress_percentage defaults to 0
        // timestamps are auto-generated
      })
      .returning()
      .execute();

    const migrationJob = result[0];
    return {
      ...migrationJob,
      source_asset_ids: migrationJob.source_asset_ids as number[], // Type assertion for JSONB field
      transformation_config: migrationJob.transformation_config as Record<string, any> | null,
      mapping_config: migrationJob.mapping_config as Record<string, any> | null
    };
  } catch (error) {
    console.error('Migration job creation failed:', error);
    throw error;
  }
};