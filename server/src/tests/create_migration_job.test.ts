import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { migrationJobsTable, connectionsTable, assetsTable } from '../db/schema';
import { type CreateMigrationJobInput } from '../schema';
import { createMigrationJob } from '../handlers/create_migration_job';
import { eq } from 'drizzle-orm';

// Test input for creating a migration job
const testInput: CreateMigrationJobInput = {
  name: 'Test Migration Job',
  description: 'A migration job for testing',
  source_asset_ids: [], // Will be populated with actual asset IDs in tests
  target_databricks_asset_type: 'ai_bi_dashboard',
  transformation_config: { transform: 'test' },
  mapping_config: { mapping: 'test' }
};

describe('createMigrationJob', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a migration job with valid assets', async () => {
    // Create prerequisite connection
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

    const connectionId = connectionResult[0].id;

    // Create prerequisite assets
    const assetResults = await db.insert(assetsTable)
      .values([
        {
          connection_id: connectionId,
          external_id: 'ext_1',
          name: 'Test Asset 1',
          description: 'First test asset',
          asset_type: 'dashboard',
          metadata: { test: true }
        },
        {
          connection_id: connectionId,
          external_id: 'ext_2',
          name: 'Test Asset 2',
          description: 'Second test asset',
          asset_type: 'report',
          metadata: { test: true }
        }
      ])
      .returning()
      .execute();

    const assetIds = assetResults.map(asset => asset.id);

    // Create migration job with these assets
    const migrationInput = {
      ...testInput,
      source_asset_ids: assetIds
    };

    const result = await createMigrationJob(migrationInput);

    // Validate basic fields
    expect(result.name).toEqual('Test Migration Job');
    expect(result.description).toEqual('A migration job for testing');
    expect(result.source_asset_ids).toEqual(assetIds);
    expect(result.target_databricks_asset_type).toEqual('ai_bi_dashboard');
    expect(result.status).toEqual('pending');
    expect(result.progress_percentage).toEqual(0);
    expect(result.transformation_config).toEqual({ transform: 'test' });
    expect(result.mapping_config).toEqual({ mapping: 'test' });
    expect(result.error_message).toBeNull();
    expect(result.started_at).toBeNull();
    expect(result.completed_at).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save migration job to database', async () => {
    // Create prerequisite data
    const connectionResult = await db.insert(connectionsTable)
      .values({
        name: 'Test Connection',
        bi_tool: 'powerbi',
        connection_url: 'https://test.powerbi.com',
        credentials_encrypted: 'encrypted_creds',
        status: 'active'
      })
      .returning()
      .execute();

    const assetResult = await db.insert(assetsTable)
      .values({
        connection_id: connectionResult[0].id,
        external_id: 'ext_test',
        name: 'Test Asset',
        description: 'Test asset for migration',
        asset_type: 'data_source',
        metadata: { source: 'test' }
      })
      .returning()
      .execute();

    const migrationInput = {
      ...testInput,
      name: 'Database Test Job',
      source_asset_ids: [assetResult[0].id],
      target_databricks_asset_type: 'unity_catalog_metric_view' as const
    };

    const result = await createMigrationJob(migrationInput);

    // Query database to verify record was saved
    const migrationJobs = await db.select()
      .from(migrationJobsTable)
      .where(eq(migrationJobsTable.id, result.id))
      .execute();

    expect(migrationJobs).toHaveLength(1);
    const savedJob = migrationJobs[0];
    expect(savedJob.name).toEqual('Database Test Job');
    expect(savedJob.source_asset_ids).toEqual([assetResult[0].id]);
    expect(savedJob.target_databricks_asset_type).toEqual('unity_catalog_metric_view');
    expect(savedJob.status).toEqual('pending');
    expect(savedJob.progress_percentage).toEqual(0);
    expect(savedJob.created_at).toBeInstanceOf(Date);
  });

  it('should handle null optional fields correctly', async () => {
    // Create prerequisite data
    const connectionResult = await db.insert(connectionsTable)
      .values({
        name: 'Test Connection',
        bi_tool: 'looker',
        connection_url: 'https://test.looker.com',
        credentials_encrypted: 'encrypted_creds'
      })
      .returning()
      .execute();

    const assetResult = await db.insert(assetsTable)
      .values({
        connection_id: connectionResult[0].id,
        external_id: 'ext_nullable',
        name: 'Nullable Test Asset',
        asset_type: 'report',
        metadata: {}
      })
      .returning()
      .execute();

    // Create job with minimal required fields
    const minimalInput: CreateMigrationJobInput = {
      name: 'Minimal Migration Job',
      description: null,
      source_asset_ids: [assetResult[0].id],
      target_databricks_asset_type: 'ai_bi_genie_space',
      transformation_config: null,
      mapping_config: null
    };

    const result = await createMigrationJob(minimalInput);

    expect(result.name).toEqual('Minimal Migration Job');
    expect(result.description).toBeNull();
    expect(result.transformation_config).toBeNull();
    expect(result.mapping_config).toBeNull();
    expect(result.source_asset_ids).toEqual([assetResult[0].id]);
  });

  it('should throw error when source asset does not exist', async () => {
    const invalidInput = {
      ...testInput,
      source_asset_ids: [999, 1000] // Non-existent asset IDs
    };

    await expect(createMigrationJob(invalidInput)).rejects.toThrow(
      /The following asset IDs do not exist: 999, 1000/i
    );
  });

  it('should throw error when some source assets do not exist', async () => {
    // Create one valid asset
    const connectionResult = await db.insert(connectionsTable)
      .values({
        name: 'Test Connection',
        bi_tool: 'tableau',
        connection_url: 'https://test.tableau.com',
        credentials_encrypted: 'encrypted_creds'
      })
      .returning()
      .execute();

    const assetResult = await db.insert(assetsTable)
      .values({
        connection_id: connectionResult[0].id,
        external_id: 'valid_asset',
        name: 'Valid Asset',
        asset_type: 'dashboard',
        metadata: {}
      })
      .returning()
      .execute();

    const mixedInput = {
      ...testInput,
      source_asset_ids: [assetResult[0].id, 999] // One valid, one invalid
    };

    await expect(createMigrationJob(mixedInput)).rejects.toThrow(
      /The following asset IDs do not exist: 999/i
    );
  });

  it('should handle multiple valid assets correctly', async () => {
    // Create connection
    const connectionResult = await db.insert(connectionsTable)
      .values({
        name: 'Multi Asset Connection',
        bi_tool: 'powerbi',
        connection_url: 'https://multi.powerbi.com',
        credentials_encrypted: 'multi_creds',
        status: 'active'
      })
      .returning()
      .execute();

    // Create multiple assets
    const assetResults = await db.insert(assetsTable)
      .values([
        {
          connection_id: connectionResult[0].id,
          external_id: 'multi_1',
          name: 'Multi Asset 1',
          asset_type: 'dashboard',
          metadata: { index: 1 }
        },
        {
          connection_id: connectionResult[0].id,
          external_id: 'multi_2',
          name: 'Multi Asset 2',
          asset_type: 'report',
          metadata: { index: 2 }
        },
        {
          connection_id: connectionResult[0].id,
          external_id: 'multi_3',
          name: 'Multi Asset 3',
          asset_type: 'data_source',
          metadata: { index: 3 }
        }
      ])
      .returning()
      .execute();

    const assetIds = assetResults.map(asset => asset.id);
    
    const multiAssetInput = {
      ...testInput,
      name: 'Multi Asset Migration',
      source_asset_ids: assetIds
    };

    const result = await createMigrationJob(multiAssetInput);

    expect(result.source_asset_ids).toEqual(assetIds);
    expect(result.source_asset_ids).toHaveLength(3);
    
    // Verify all asset IDs are properly stored and retrieved
    assetIds.forEach(id => {
      expect(result.source_asset_ids).toContain(id);
    });
  });
});