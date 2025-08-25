import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { connectionsTable, assetsTable, migrationJobsTable, migrationHistoryTable } from '../db/schema';
import { getMigrationHistory } from '../handlers/get_migration_history';

describe('getMigrationHistory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array for non-existent migration job', async () => {
    const result = await getMigrationHistory(999);
    expect(result).toEqual([]);
  });

  it('should return migration history in chronological order', async () => {
    // Create prerequisite connection
    const [connection] = await db.insert(connectionsTable)
      .values({
        name: 'Test Connection',
        bi_tool: 'tableau',
        connection_url: 'https://example.com',
        credentials_encrypted: 'encrypted_creds',
        status: 'active'
      })
      .returning()
      .execute();

    // Create prerequisite asset
    const [asset] = await db.insert(assetsTable)
      .values({
        connection_id: connection.id,
        external_id: 'ext_123',
        name: 'Test Asset',
        description: 'Test description',
        asset_type: 'report',
        metadata: { key: 'value' }
      })
      .returning()
      .execute();

    // Create migration job
    const [migrationJob] = await db.insert(migrationJobsTable)
      .values({
        name: 'Test Migration',
        description: 'Test migration job',
        source_asset_ids: [asset.id],
        target_databricks_asset_type: 'ai_bi_dashboard',
        status: 'pending'
      })
      .returning()
      .execute();

    // Create migration history entries with different timestamps
    const baseTime = new Date();
    const firstEntry = new Date(baseTime.getTime() - 2000); // 2 seconds earlier
    const secondEntry = new Date(baseTime.getTime() - 1000); // 1 second earlier
    const thirdEntry = baseTime;

    await db.insert(migrationHistoryTable)
      .values([
        {
          migration_job_id: migrationJob.id,
          status: 'pending',
          message: 'Migration job created',
          created_at: firstEntry
        },
        {
          migration_job_id: migrationJob.id,
          status: 'in_progress',
          message: 'Migration started',
          created_at: secondEntry
        },
        {
          migration_job_id: migrationJob.id,
          status: 'completed',
          message: 'Migration completed successfully',
          created_at: thirdEntry
        }
      ])
      .execute();

    const result = await getMigrationHistory(migrationJob.id);

    expect(result).toHaveLength(3);
    
    // Verify chronological order (oldest first)
    expect(result[0].status).toEqual('pending');
    expect(result[0].message).toEqual('Migration job created');
    expect(result[0].created_at).toEqual(firstEntry);
    
    expect(result[1].status).toEqual('in_progress');
    expect(result[1].message).toEqual('Migration started');
    expect(result[1].created_at).toEqual(secondEntry);
    
    expect(result[2].status).toEqual('completed');
    expect(result[2].message).toEqual('Migration completed successfully');
    expect(result[2].created_at).toEqual(thirdEntry);

    // Verify all entries have correct migration_job_id
    result.forEach(entry => {
      expect(entry.migration_job_id).toEqual(migrationJob.id);
      expect(entry.id).toBeDefined();
    });
  });

  it('should only return history for the specified migration job', async () => {
    // Create prerequisite connection
    const [connection] = await db.insert(connectionsTable)
      .values({
        name: 'Test Connection',
        bi_tool: 'powerbi',
        connection_url: 'https://example.com',
        credentials_encrypted: 'encrypted_creds',
        status: 'active'
      })
      .returning()
      .execute();

    // Create prerequisite asset
    const [asset] = await db.insert(assetsTable)
      .values({
        connection_id: connection.id,
        external_id: 'ext_456',
        name: 'Test Asset',
        description: 'Test description',
        asset_type: 'dashboard',
        metadata: { key: 'value' }
      })
      .returning()
      .execute();

    // Create two migration jobs
    const [migrationJob1] = await db.insert(migrationJobsTable)
      .values({
        name: 'Migration Job 1',
        description: 'First job',
        source_asset_ids: [asset.id],
        target_databricks_asset_type: 'unity_catalog_metric_view',
        status: 'pending'
      })
      .returning()
      .execute();

    const [migrationJob2] = await db.insert(migrationJobsTable)
      .values({
        name: 'Migration Job 2',
        description: 'Second job',
        source_asset_ids: [asset.id],
        target_databricks_asset_type: 'ai_bi_genie_space',
        status: 'pending'
      })
      .returning()
      .execute();

    // Create history entries for both jobs
    await db.insert(migrationHistoryTable)
      .values([
        {
          migration_job_id: migrationJob1.id,
          status: 'pending',
          message: 'Job 1 created'
        },
        {
          migration_job_id: migrationJob1.id,
          status: 'in_progress',
          message: 'Job 1 started'
        },
        {
          migration_job_id: migrationJob2.id,
          status: 'pending',
          message: 'Job 2 created'
        },
        {
          migration_job_id: migrationJob2.id,
          status: 'failed',
          message: 'Job 2 failed'
        }
      ])
      .execute();

    // Get history for job 1 only
    const result1 = await getMigrationHistory(migrationJob1.id);
    expect(result1).toHaveLength(2);
    result1.forEach(entry => {
      expect(entry.migration_job_id).toEqual(migrationJob1.id);
    });
    expect(result1[0].message).toEqual('Job 1 created');
    expect(result1[1].message).toEqual('Job 1 started');

    // Get history for job 2 only
    const result2 = await getMigrationHistory(migrationJob2.id);
    expect(result2).toHaveLength(2);
    result2.forEach(entry => {
      expect(entry.migration_job_id).toEqual(migrationJob2.id);
    });
    expect(result2[0].message).toEqual('Job 2 created');
    expect(result2[1].message).toEqual('Job 2 failed');
  });

  it('should handle history entries with null messages', async () => {
    // Create prerequisite connection and asset
    const [connection] = await db.insert(connectionsTable)
      .values({
        name: 'Test Connection',
        bi_tool: 'looker',
        connection_url: 'https://example.com',
        credentials_encrypted: 'encrypted_creds',
        status: 'active'
      })
      .returning()
      .execute();

    const [asset] = await db.insert(assetsTable)
      .values({
        connection_id: connection.id,
        external_id: 'ext_789',
        name: 'Test Asset',
        description: 'Test description',
        asset_type: 'data_source',
        metadata: { key: 'value' }
      })
      .returning()
      .execute();

    // Create migration job
    const [migrationJob] = await db.insert(migrationJobsTable)
      .values({
        name: 'Test Migration',
        description: 'Test migration job',
        source_asset_ids: [asset.id],
        target_databricks_asset_type: 'ai_bi_dashboard',
        status: 'pending'
      })
      .returning()
      .execute();

    // Create history entry with null message
    await db.insert(migrationHistoryTable)
      .values({
        migration_job_id: migrationJob.id,
        status: 'pending',
        message: null
      })
      .execute();

    const result = await getMigrationHistory(migrationJob.id);

    expect(result).toHaveLength(1);
    expect(result[0].migration_job_id).toEqual(migrationJob.id);
    expect(result[0].status).toEqual('pending');
    expect(result[0].message).toBeNull();
    expect(result[0].created_at).toBeInstanceOf(Date);
  });
});