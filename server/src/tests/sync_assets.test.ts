import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { connectionsTable, assetsTable } from '../db/schema';
import { syncAssets } from '../handlers/sync_assets';
import { eq } from 'drizzle-orm';

// Test connection data
const testConnection = {
  name: 'Test BI Connection',
  bi_tool: 'tableau' as const,
  connection_url: 'https://tableau.example.com',
  credentials_encrypted: 'encrypted_credentials_123',
  status: 'active' as const
};

describe('syncAssets', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should sync assets for active connection', async () => {
    // Create test connection
    const connectionResult = await db.insert(connectionsTable)
      .values(testConnection)
      .returning()
      .execute();
    
    const connectionId = connectionResult[0].id;

    // Sync assets
    const result = await syncAssets(connectionId);

    // Verify assets were created
    expect(result).toHaveLength(2);
    expect(result[0].connection_id).toEqual(connectionId);
    expect(result[0].name).toMatch(/Synced Report/);
    expect(result[0].asset_type).toEqual('report');
    expect(result[0].external_id).toMatch(/ext_.*_report_1/);
    expect(result[0].metadata).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);

    expect(result[1].connection_id).toEqual(connectionId);
    expect(result[1].name).toMatch(/Synced Dashboard/);
    expect(result[1].asset_type).toEqual('dashboard');
    expect(result[1].external_id).toMatch(/ext_.*_dashboard_1/);
  });

  it('should save synced assets to database', async () => {
    // Create test connection
    const connectionResult = await db.insert(connectionsTable)
      .values(testConnection)
      .returning()
      .execute();
    
    const connectionId = connectionResult[0].id;

    // Sync assets
    const result = await syncAssets(connectionId);

    // Query database to verify assets were saved
    const savedAssets = await db.select()
      .from(assetsTable)
      .where(eq(assetsTable.connection_id, connectionId))
      .execute();

    expect(savedAssets).toHaveLength(2);
    expect(savedAssets[0].id).toEqual(result[0].id);
    expect(savedAssets[0].name).toEqual(result[0].name);
    expect(savedAssets[0].asset_type).toEqual(result[0].asset_type);
    expect(savedAssets[0].metadata).toEqual(result[0].metadata);

    expect(savedAssets[1].id).toEqual(result[1].id);
    expect(savedAssets[1].name).toEqual(result[1].name);
    expect(savedAssets[1].asset_type).toEqual(result[1].asset_type);
  });

  it('should update connection last_sync_at timestamp', async () => {
    // Create test connection
    const connectionResult = await db.insert(connectionsTable)
      .values(testConnection)
      .returning()
      .execute();
    
    const connectionId = connectionResult[0].id;
    const originalLastSync = connectionResult[0].last_sync_at;

    // Sync assets
    await syncAssets(connectionId);

    // Verify last_sync_at was updated
    const updatedConnection = await db.select()
      .from(connectionsTable)
      .where(eq(connectionsTable.id, connectionId))
      .execute();

    expect(updatedConnection[0].last_sync_at).toBeDefined();
    expect(updatedConnection[0].last_sync_at).toBeInstanceOf(Date);
    expect(updatedConnection[0].last_sync_at).not.toEqual(originalLastSync);
    expect(updatedConnection[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent connection', async () => {
    const nonExistentId = 99999;

    await expect(syncAssets(nonExistentId))
      .rejects
      .toThrow(/Connection with ID 99999 not found/);
  });

  it('should throw error for inactive connection', async () => {
    // Create inactive connection
    const inactiveConnection = {
      ...testConnection,
      status: 'inactive' as const
    };

    const connectionResult = await db.insert(connectionsTable)
      .values(inactiveConnection)
      .returning()
      .execute();
    
    const connectionId = connectionResult[0].id;

    await expect(syncAssets(connectionId))
      .rejects
      .toThrow(/Connection .* is not active.*Status: inactive/);
  });

  it('should throw error for connection with error status', async () => {
    // Create connection with error status
    const errorConnection = {
      ...testConnection,
      status: 'error' as const
    };

    const connectionResult = await db.insert(connectionsTable)
      .values(errorConnection)
      .returning()
      .execute();
    
    const connectionId = connectionResult[0].id;

    await expect(syncAssets(connectionId))
      .rejects
      .toThrow(/Connection .* is not active.*Status: error/);
  });

  it('should create assets with proper metadata structure', async () => {
    // Create test connection
    const connectionResult = await db.insert(connectionsTable)
      .values(testConnection)
      .returning()
      .execute();
    
    const connectionId = connectionResult[0].id;

    // Sync assets
    const result = await syncAssets(connectionId);

    // Verify metadata structure for report
    const reportAsset = result.find(asset => asset.asset_type === 'report');
    expect(reportAsset).toBeDefined();
    expect(reportAsset!.metadata).toEqual({
      owner: 'system',
      last_modified: expect.any(String),
      source_url: `${testConnection.connection_url}/reports/1`
    });

    // Verify metadata structure for dashboard
    const dashboardAsset = result.find(asset => asset.asset_type === 'dashboard');
    expect(dashboardAsset).toBeDefined();
    expect(dashboardAsset!.metadata).toEqual({
      owner: 'system',
      last_modified: expect.any(String),
      source_url: `${testConnection.connection_url}/dashboards/1`
    });
  });

  it('should generate unique external IDs for assets', async () => {
    // Create test connection
    const connectionResult = await db.insert(connectionsTable)
      .values(testConnection)
      .returning()
      .execute();
    
    const connectionId = connectionResult[0].id;

    // Sync assets multiple times
    const firstSync = await syncAssets(connectionId);
    const secondSync = await syncAssets(connectionId);

    // Verify all external IDs are unique
    const allExternalIds = [
      ...firstSync.map(asset => asset.external_id),
      ...secondSync.map(asset => asset.external_id)
    ];

    const uniqueExternalIds = new Set(allExternalIds);
    expect(uniqueExternalIds.size).toEqual(allExternalIds.length);

    // Verify pattern matches expected format
    allExternalIds.forEach(externalId => {
      expect(externalId).toMatch(/^ext_\d+_(report|dashboard)_1$/);
    });
  });
});