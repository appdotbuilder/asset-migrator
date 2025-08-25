import { db } from '../db';
import { migrationJobsTable, migrationHistoryTable } from '../db/schema';
import { type UpdateMigrationJobInput, type MigrationJob } from '../schema';
import { eq } from 'drizzle-orm';

export const updateMigrationJob = async (input: UpdateMigrationJobInput): Promise<MigrationJob> => {
  try {
    // First, verify the migration job exists
    const existingJob = await db.select()
      .from(migrationJobsTable)
      .where(eq(migrationJobsTable.id, input.id))
      .execute();

    if (existingJob.length === 0) {
      throw new Error(`Migration job with id ${input.id} not found`);
    }

    const currentJob = existingJob[0];
    
    // Prepare update data
    const updateData: any = {
      updated_at: new Date()
    };

    // Only update provided fields
    if (input.status !== undefined) {
      updateData.status = input.status;
      
      // Set timestamps based on status changes
      if (input.status === 'in_progress' && !currentJob.started_at) {
        updateData.started_at = new Date();
      }
      
      if ((input.status === 'completed' || input.status === 'failed' || input.status === 'cancelled') && !currentJob.completed_at) {
        updateData.completed_at = new Date();
      }
    }

    if (input.error_message !== undefined) {
      updateData.error_message = input.error_message;
    }

    if (input.progress_percentage !== undefined) {
      updateData.progress_percentage = input.progress_percentage;
    }

    if (input.transformation_config !== undefined) {
      updateData.transformation_config = input.transformation_config;
    }

    if (input.mapping_config !== undefined) {
      updateData.mapping_config = input.mapping_config;
    }

    // Update the migration job
    const result = await db.update(migrationJobsTable)
      .set(updateData)
      .where(eq(migrationJobsTable.id, input.id))
      .returning()
      .execute();

    const updatedJob = result[0];

    // Create history record if status changed
    if (input.status !== undefined && input.status !== currentJob.status) {
      await db.insert(migrationHistoryTable)
        .values({
          migration_job_id: input.id,
          status: input.status,
          message: input.error_message || `Status changed to ${input.status}`
        })
        .execute();
    }

    return {
      ...updatedJob,
      source_asset_ids: updatedJob.source_asset_ids as number[],
      transformation_config: updatedJob.transformation_config as Record<string, any> | null,
      mapping_config: updatedJob.mapping_config as Record<string, any> | null
    };
  } catch (error) {
    console.error('Migration job update failed:', error);
    throw error;
  }
};