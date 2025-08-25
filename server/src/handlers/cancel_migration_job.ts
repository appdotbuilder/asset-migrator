import { db } from '../db';
import { migrationJobsTable, migrationHistoryTable } from '../db/schema';
import { type MigrationJob } from '../schema';
import { eq } from 'drizzle-orm';

export const cancelMigrationJob = async (jobId: number): Promise<MigrationJob> => {
  try {
    // First, verify the job exists and can be cancelled
    const existingJob = await db.select()
      .from(migrationJobsTable)
      .where(eq(migrationJobsTable.id, jobId))
      .execute();

    if (existingJob.length === 0) {
      throw new Error(`Migration job with ID ${jobId} not found`);
    }

    const job = existingJob[0];
    
    // Check if job can be cancelled (must be pending or in_progress)
    if (!['pending', 'in_progress'].includes(job.status)) {
      throw new Error(`Cannot cancel migration job with status '${job.status}'. Only pending or in_progress jobs can be cancelled.`);
    }

    // Update job status to cancelled and set completed_at timestamp
    const updatedJob = await db.update(migrationJobsTable)
      .set({
        status: 'cancelled',
        error_message: 'Job cancelled by user',
        updated_at: new Date(),
        completed_at: new Date()
      })
      .where(eq(migrationJobsTable.id, jobId))
      .returning()
      .execute();

    // Create history record for the cancellation
    await db.insert(migrationHistoryTable)
      .values({
        migration_job_id: jobId,
        status: 'cancelled',
        message: 'Migration job cancelled by user'
      })
      .execute();

    // Convert JSON fields back to proper types for return
    const result = updatedJob[0];
    return {
      ...result,
      source_asset_ids: result.source_asset_ids as number[],
      transformation_config: result.transformation_config as Record<string, any> | null,
      mapping_config: result.mapping_config as Record<string, any> | null
    };
  } catch (error) {
    console.error('Migration job cancellation failed:', error);
    throw error;
  }
};