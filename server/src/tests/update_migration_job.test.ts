import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { connectionsTable, assetsTable, migrationJobsTable, migrationHistoryTable } from '../db/schema';
import { type UpdateMigrationJobInput } from '../schema';
import { updateMigrationJob } from '../handlers/update_migration_job';
import { eq } from 'drizzle-orm';

describe('updateMigrationJob', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let connectionId: number;
  let assetId: number;
  let migrationJobId: number;

  beforeEach(async () => {
    // Create prerequisite data
    const connectionResult = await db.insert(connectionsTable)
      .values({
        name: 'Test Connection',
        bi_tool: 'tableau',
        connection_url: 'https://test.tableau.com',
        credentials_encrypted: 'encrypted_creds',
        status: 'active'
      })
      .returning()
      .execute();
    
    connectionId = connectionResult[0].id;

    const assetResult = await db.insert(assetsTable)
      .values({
        connection_id: connectionId,
        external_id: 'ext_asset_1',
        name: 'Test Asset',
        description: 'A test asset',
        asset_type: 'dashboard',
        metadata: { test: 'data' }
      })
      .returning()
      .execute();

    assetId = assetResult[0].id;

    const migrationJobResult = await db.insert(migrationJobsTable)
      .values({
        name: 'Test Migration Job',
        description: 'A test migration job',
        source_asset_ids: [assetId],
        target_databricks_asset_type: 'ai_bi_dashboard',
        status: 'pending',
        progress_percentage: 0
      })
      .returning()
      .execute();

    migrationJobId = migrationJobResult[0].id;
  });

  it('should update migration job status', async () => {
    const input: UpdateMigrationJobInput = {
      id: migrationJobId,
      status: 'in_progress',
      progress_percentage: 25
    };

    const result = await updateMigrationJob(input);

    expect(result.id).toEqual(migrationJobId);
    expect(result.status).toEqual('in_progress');
    expect(result.progress_percentage).toEqual(25);
    expect(result.started_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update error message and set status to failed', async () => {
    const input: UpdateMigrationJobInput = {
      id: migrationJobId,
      status: 'failed',
      error_message: 'Migration failed due to connection timeout',
      progress_percentage: 50
    };

    const result = await updateMigrationJob(input);

    expect(result.status).toEqual('failed');
    expect(result.error_message).toEqual('Migration failed due to connection timeout');
    expect(result.progress_percentage).toEqual(50);
    expect(result.completed_at).toBeInstanceOf(Date);
  });

  it('should update configuration fields', async () => {
    const transformationConfig = { transform: 'data', field_mapping: true };
    const mappingConfig = { source_field: 'target_field', date_format: 'yyyy-mm-dd' };

    const input: UpdateMigrationJobInput = {
      id: migrationJobId,
      transformation_config: transformationConfig,
      mapping_config: mappingConfig
    };

    const result = await updateMigrationJob(input);

    expect(result.transformation_config).toEqual(transformationConfig);
    expect(result.mapping_config).toEqual(mappingConfig);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save changes to database', async () => {
    const input: UpdateMigrationJobInput = {
      id: migrationJobId,
      status: 'completed',
      progress_percentage: 100
    };

    await updateMigrationJob(input);

    const jobs = await db.select()
      .from(migrationJobsTable)
      .where(eq(migrationJobsTable.id, migrationJobId))
      .execute();

    expect(jobs).toHaveLength(1);
    expect(jobs[0].status).toEqual('completed');
    expect(jobs[0].progress_percentage).toEqual(100);
    expect(jobs[0].completed_at).toBeInstanceOf(Date);
  });

  it('should create history record when status changes', async () => {
    const input: UpdateMigrationJobInput = {
      id: migrationJobId,
      status: 'in_progress'
    };

    await updateMigrationJob(input);

    const history = await db.select()
      .from(migrationHistoryTable)
      .where(eq(migrationHistoryTable.migration_job_id, migrationJobId))
      .execute();

    expect(history).toHaveLength(1);
    expect(history[0].status).toEqual('in_progress');
    expect(history[0].message).toEqual('Status changed to in_progress');
    expect(history[0].created_at).toBeInstanceOf(Date);
  });

  it('should create history record with custom message', async () => {
    const input: UpdateMigrationJobInput = {
      id: migrationJobId,
      status: 'failed',
      error_message: 'Custom error message'
    };

    await updateMigrationJob(input);

    const history = await db.select()
      .from(migrationHistoryTable)
      .where(eq(migrationHistoryTable.migration_job_id, migrationJobId))
      .execute();

    expect(history).toHaveLength(1);
    expect(history[0].status).toEqual('failed');
    expect(history[0].message).toEqual('Custom error message');
  });

  it('should not create history record when status is not updated', async () => {
    const input: UpdateMigrationJobInput = {
      id: migrationJobId,
      progress_percentage: 75
    };

    await updateMigrationJob(input);

    const history = await db.select()
      .from(migrationHistoryTable)
      .where(eq(migrationHistoryTable.migration_job_id, migrationJobId))
      .execute();

    expect(history).toHaveLength(0);
  });

  it('should set started_at timestamp when status changes to in_progress', async () => {
    const input: UpdateMigrationJobInput = {
      id: migrationJobId,
      status: 'in_progress'
    };

    const result = await updateMigrationJob(input);

    expect(result.started_at).toBeInstanceOf(Date);
    expect(result.completed_at).toBeNull();
  });

  it('should set completed_at timestamp when status changes to completed', async () => {
    const input: UpdateMigrationJobInput = {
      id: migrationJobId,
      status: 'completed'
    };

    const result = await updateMigrationJob(input);

    expect(result.completed_at).toBeInstanceOf(Date);
  });

  it('should throw error when migration job does not exist', async () => {
    const input: UpdateMigrationJobInput = {
      id: 999999,
      status: 'in_progress'
    };

    await expect(updateMigrationJob(input)).rejects.toThrow(/Migration job with id 999999 not found/);
  });

  it('should update only provided fields and leave others unchanged', async () => {
    // First, set some initial state
    await updateMigrationJob({
      id: migrationJobId,
      status: 'in_progress',
      progress_percentage: 50,
      error_message: 'Initial error'
    });

    // Then update only progress_percentage
    const input: UpdateMigrationJobInput = {
      id: migrationJobId,
      progress_percentage: 75
    };

    const result = await updateMigrationJob(input);

    expect(result.progress_percentage).toEqual(75);
    expect(result.status).toEqual('in_progress'); // Should remain unchanged
    expect(result.error_message).toEqual('Initial error'); // Should remain unchanged
  });
});