import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { connectionsTable, assetsTable, migrationJobsTable } from '../db/schema';
import { type GetMigrationJobsQuery } from '../schema';
import { getMigrationJobs } from '../handlers/get_migration_jobs';

// Test data setup
const testConnection = {
  name: 'Test Connection',
  bi_tool: 'tableau' as const,
  connection_url: 'https://tableau.example.com',
  credentials_encrypted: 'encrypted_creds',
  status: 'active' as const
};

const testAsset = {
  connection_id: 1,
  external_id: 'ext_123',
  name: 'Test Asset',
  description: 'A test asset',
  asset_type: 'report' as const,
  metadata: { key: 'value' }
};

const testMigrationJob1 = {
  name: 'Migration Job 1',
  description: 'First test migration job',
  source_asset_ids: [1, 2],
  target_databricks_asset_type: 'ai_bi_dashboard' as const,
  status: 'pending' as const,
  transformation_config: { transform: 'config1' },
  mapping_config: { map: 'config1' },
  progress_percentage: 0
};

const testMigrationJob2 = {
  name: 'Migration Job 2',
  description: 'Second test migration job',
  source_asset_ids: [3],
  target_databricks_asset_type: 'unity_catalog_metric_view' as const,
  status: 'completed' as const,
  transformation_config: { transform: 'config2' },
  mapping_config: null,
  progress_percentage: 100
};

const testMigrationJob3 = {
  name: 'Migration Job 3',
  description: null,
  source_asset_ids: [1],
  target_databricks_asset_type: 'ai_bi_genie_space' as const,
  status: 'failed' as const,
  transformation_config: null,
  mapping_config: { map: 'config3' },
  error_message: 'Migration failed',
  progress_percentage: 50
};

describe('getMigrationJobs', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all migration jobs when no query is provided', async () => {
    // Create prerequisite data
    await db.insert(connectionsTable).values(testConnection).execute();
    await db.insert(assetsTable).values(testAsset).execute();

    // Create migration jobs
    await db.insert(migrationJobsTable).values([
      testMigrationJob1,
      testMigrationJob2,
      testMigrationJob3
    ]).execute();

    const result = await getMigrationJobs();

    expect(result).toHaveLength(3);
    expect(result[0].name).toEqual('Migration Job 1');
    expect(result[0].source_asset_ids).toEqual([1, 2]);
    expect(result[0].target_databricks_asset_type).toEqual('ai_bi_dashboard');
    expect(result[0].status).toEqual('pending');
    expect(result[0].transformation_config).toEqual({ transform: 'config1' });
    expect(result[0].mapping_config).toEqual({ map: 'config1' });
    expect(result[0].progress_percentage).toEqual(0);
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should filter migration jobs by status', async () => {
    // Create prerequisite data
    await db.insert(connectionsTable).values(testConnection).execute();
    await db.insert(assetsTable).values(testAsset).execute();

    // Create migration jobs
    await db.insert(migrationJobsTable).values([
      testMigrationJob1,
      testMigrationJob2,
      testMigrationJob3
    ]).execute();

    const query: GetMigrationJobsQuery = {
      status: 'completed'
    };

    const result = await getMigrationJobs(query);

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Migration Job 2');
    expect(result[0].status).toEqual('completed');
    expect(result[0].progress_percentage).toEqual(100);
  });

  it('should filter migration jobs by target_databricks_asset_type', async () => {
    // Create prerequisite data
    await db.insert(connectionsTable).values(testConnection).execute();
    await db.insert(assetsTable).values(testAsset).execute();

    // Create migration jobs
    await db.insert(migrationJobsTable).values([
      testMigrationJob1,
      testMigrationJob2,
      testMigrationJob3
    ]).execute();

    const query: GetMigrationJobsQuery = {
      target_databricks_asset_type: 'unity_catalog_metric_view'
    };

    const result = await getMigrationJobs(query);

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Migration Job 2');
    expect(result[0].target_databricks_asset_type).toEqual('unity_catalog_metric_view');
  });

  it('should filter migration jobs by both status and target_databricks_asset_type', async () => {
    // Create prerequisite data
    await db.insert(connectionsTable).values(testConnection).execute();
    await db.insert(assetsTable).values(testAsset).execute();

    // Create migration jobs
    await db.insert(migrationJobsTable).values([
      testMigrationJob1,
      testMigrationJob2,
      testMigrationJob3
    ]).execute();

    const query: GetMigrationJobsQuery = {
      status: 'failed',
      target_databricks_asset_type: 'ai_bi_genie_space'
    };

    const result = await getMigrationJobs(query);

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Migration Job 3');
    expect(result[0].status).toEqual('failed');
    expect(result[0].target_databricks_asset_type).toEqual('ai_bi_genie_space');
    expect(result[0].error_message).toEqual('Migration failed');
  });

  it('should return empty array when no migration jobs match filters', async () => {
    // Create prerequisite data
    await db.insert(connectionsTable).values(testConnection).execute();
    await db.insert(assetsTable).values(testAsset).execute();

    // Create migration jobs
    await db.insert(migrationJobsTable).values([
      testMigrationJob1,
      testMigrationJob2
    ]).execute();

    const query: GetMigrationJobsQuery = {
      status: 'cancelled'
    };

    const result = await getMigrationJobs(query);

    expect(result).toHaveLength(0);
  });

  it('should handle null and optional fields correctly', async () => {
    // Create prerequisite data
    await db.insert(connectionsTable).values(testConnection).execute();
    await db.insert(assetsTable).values(testAsset).execute();

    // Create migration job with null/optional fields
    await db.insert(migrationJobsTable).values(testMigrationJob3).execute();

    const result = await getMigrationJobs();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Migration Job 3');
    expect(result[0].description).toBeNull();
    expect(result[0].transformation_config).toBeNull();
    expect(result[0].mapping_config).toEqual({ map: 'config3' });
    expect(result[0].error_message).toEqual('Migration failed');
    expect(result[0].started_at).toBeNull();
    expect(result[0].completed_at).toBeNull();
  });

  it('should return empty array when no migration jobs exist', async () => {
    const result = await getMigrationJobs();

    expect(result).toHaveLength(0);
  });

  it('should handle different databricks asset types correctly', async () => {
    // Create prerequisite data
    await db.insert(connectionsTable).values(testConnection).execute();
    await db.insert(assetsTable).values(testAsset).execute();

    // Create migration jobs with different asset types
    const jobs = [
      { ...testMigrationJob1, target_databricks_asset_type: 'ai_bi_dashboard' as const },
      { ...testMigrationJob2, target_databricks_asset_type: 'unity_catalog_metric_view' as const },
      { ...testMigrationJob3, target_databricks_asset_type: 'ai_bi_genie_space' as const }
    ];

    await db.insert(migrationJobsTable).values(jobs).execute();

    const result = await getMigrationJobs();

    expect(result).toHaveLength(3);
    
    const assetTypes = result.map(job => job.target_databricks_asset_type);
    expect(assetTypes).toContain('ai_bi_dashboard');
    expect(assetTypes).toContain('unity_catalog_metric_view');
    expect(assetTypes).toContain('ai_bi_genie_space');
  });
});