import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { connectionsTable, assetsTable, migrationJobsTable, migrationHistoryTable } from '../db/schema';
import { cancelMigrationJob } from '../handlers/cancel_migration_job';
import { eq } from 'drizzle-orm';

describe('cancelMigrationJob', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create prerequisite data
  const createTestData = async () => {
    // Create connection
    const connection = await db.insert(connectionsTable)
      .values({
        name: 'Test Connection',
        bi_tool: 'tableau',
        connection_url: 'https://example.com',
        credentials_encrypted: 'encrypted_creds',
        status: 'active'
      })
      .returning()
      .execute();

    // Create assets
    const assets = await db.insert(assetsTable)
      .values([
        {
          connection_id: connection[0].id,
          external_id: 'ext_1',
          name: 'Test Asset 1',
          description: 'Description 1',
          asset_type: 'report',
          metadata: { key: 'value1' }
        },
        {
          connection_id: connection[0].id,
          external_id: 'ext_2', 
          name: 'Test Asset 2',
          description: 'Description 2',
          asset_type: 'dashboard',
          metadata: { key: 'value2' }
        }
      ])
      .returning()
      .execute();

    return { connection: connection[0], assets };
  };

  it('should cancel a pending migration job', async () => {
    const { assets } = await createTestData();

    // Create a pending migration job
    const job = await db.insert(migrationJobsTable)
      .values({
        name: 'Test Migration Job',
        description: 'Test job to be cancelled',
        source_asset_ids: [assets[0].id, assets[1].id],
        target_databricks_asset_type: 'ai_bi_dashboard',
        status: 'pending',
        progress_percentage: 0
      })
      .returning()
      .execute();

    const result = await cancelMigrationJob(job[0].id);

    // Verify job status was updated
    expect(result.id).toEqual(job[0].id);
    expect(result.name).toEqual('Test Migration Job');
    expect(result.status).toEqual('cancelled');
    expect(result.error_message).toEqual('Job cancelled by user');
    expect(result.completed_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.source_asset_ids).toEqual([assets[0].id, assets[1].id]);
  });

  it('should cancel an in_progress migration job', async () => {
    const { assets } = await createTestData();

    // Create an in_progress migration job
    const job = await db.insert(migrationJobsTable)
      .values({
        name: 'In Progress Job',
        description: 'Job currently running',
        source_asset_ids: [assets[0].id],
        target_databricks_asset_type: 'unity_catalog_metric_view',
        status: 'in_progress',
        progress_percentage: 45,
        started_at: new Date()
      })
      .returning()
      .execute();

    const result = await cancelMigrationJob(job[0].id);

    expect(result.status).toEqual('cancelled');
    expect(result.error_message).toEqual('Job cancelled by user');
    expect(result.completed_at).toBeInstanceOf(Date);
    expect(result.progress_percentage).toEqual(45); // Should preserve existing progress
  });

  it('should save cancelled job to database', async () => {
    const { assets } = await createTestData();

    const job = await db.insert(migrationJobsTable)
      .values({
        name: 'Database Test Job',
        description: 'Testing database persistence',
        source_asset_ids: [assets[0].id],
        target_databricks_asset_type: 'ai_bi_genie_space',
        status: 'pending',
        progress_percentage: 0
      })
      .returning()
      .execute();

    await cancelMigrationJob(job[0].id);

    // Verify job was updated in database
    const updatedJobs = await db.select()
      .from(migrationJobsTable)
      .where(eq(migrationJobsTable.id, job[0].id))
      .execute();

    expect(updatedJobs).toHaveLength(1);
    expect(updatedJobs[0].status).toEqual('cancelled');
    expect(updatedJobs[0].error_message).toEqual('Job cancelled by user');
    expect(updatedJobs[0].completed_at).toBeInstanceOf(Date);
  });

  it('should create history record when cancelling job', async () => {
    const { assets } = await createTestData();

    const job = await db.insert(migrationJobsTable)
      .values({
        name: 'History Test Job',
        description: 'Testing history creation',
        source_asset_ids: [assets[0].id, assets[1].id],
        target_databricks_asset_type: 'ai_bi_dashboard',
        status: 'pending',
        progress_percentage: 0
      })
      .returning()
      .execute();

    await cancelMigrationJob(job[0].id);

    // Verify history record was created
    const history = await db.select()
      .from(migrationHistoryTable)
      .where(eq(migrationHistoryTable.migration_job_id, job[0].id))
      .execute();

    expect(history).toHaveLength(1);
    expect(history[0].migration_job_id).toEqual(job[0].id);
    expect(history[0].status).toEqual('cancelled');
    expect(history[0].message).toEqual('Migration job cancelled by user');
    expect(history[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error when job does not exist', async () => {
    const nonExistentJobId = 99999;

    await expect(cancelMigrationJob(nonExistentJobId))
      .rejects.toThrow(/Migration job with ID 99999 not found/i);
  });

  it('should throw error when job is already completed', async () => {
    const { assets } = await createTestData();

    const job = await db.insert(migrationJobsTable)
      .values({
        name: 'Completed Job',
        description: 'Already completed job',
        source_asset_ids: [assets[0].id],
        target_databricks_asset_type: 'ai_bi_dashboard',
        status: 'completed',
        progress_percentage: 100,
        started_at: new Date(),
        completed_at: new Date()
      })
      .returning()
      .execute();

    await expect(cancelMigrationJob(job[0].id))
      .rejects.toThrow(/Cannot cancel migration job with status 'completed'/i);
  });

  it('should throw error when job has failed', async () => {
    const { assets } = await createTestData();

    const job = await db.insert(migrationJobsTable)
      .values({
        name: 'Failed Job',
        description: 'Previously failed job',
        source_asset_ids: [assets[0].id],
        target_databricks_asset_type: 'unity_catalog_metric_view',
        status: 'failed',
        progress_percentage: 30,
        error_message: 'Previous error',
        started_at: new Date()
      })
      .returning()
      .execute();

    await expect(cancelMigrationJob(job[0].id))
      .rejects.toThrow(/Cannot cancel migration job with status 'failed'/i);
  });

  it('should throw error when job is already cancelled', async () => {
    const { assets } = await createTestData();

    const job = await db.insert(migrationJobsTable)
      .values({
        name: 'Already Cancelled Job',
        description: 'Previously cancelled job',
        source_asset_ids: [assets[0].id],
        target_databricks_asset_type: 'ai_bi_genie_space',
        status: 'cancelled',
        progress_percentage: 20,
        error_message: 'Previously cancelled',
        completed_at: new Date()
      })
      .returning()
      .execute();

    await expect(cancelMigrationJob(job[0].id))
      .rejects.toThrow(/Cannot cancel migration job with status 'cancelled'/i);
  });

  it('should preserve existing job data when cancelling', async () => {
    const { assets } = await createTestData();

    const transformationConfig = { transform: 'data' };
    const mappingConfig = { map: 'fields' };

    const job = await db.insert(migrationJobsTable)
      .values({
        name: 'Preserve Data Job',
        description: 'Job with existing configs',
        source_asset_ids: [assets[0].id, assets[1].id],
        target_databricks_asset_type: 'ai_bi_dashboard',
        status: 'in_progress',
        progress_percentage: 75,
        transformation_config: transformationConfig,
        mapping_config: mappingConfig,
        started_at: new Date()
      })
      .returning()
      .execute();

    const result = await cancelMigrationJob(job[0].id);

    // Verify existing data is preserved
    expect(result.name).toEqual('Preserve Data Job');
    expect(result.description).toEqual('Job with existing configs');
    expect(result.progress_percentage).toEqual(75);
    expect(result.transformation_config).toEqual(transformationConfig);
    expect(result.mapping_config).toEqual(mappingConfig);
    expect(result.started_at).toBeInstanceOf(Date);
    expect(result.status).toEqual('cancelled');
    expect(result.error_message).toEqual('Job cancelled by user');
  });
});