import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { connectionsTable, assetsTable } from '../db/schema';
import { type GetAssetsQuery, type CreateConnectionInput, type CreateAssetInput } from '../schema';
import { getAssets } from '../handlers/get_assets';

// Test connection data
const testConnection: CreateConnectionInput = {
  name: 'Test Tableau Connection',
  bi_tool: 'tableau',
  connection_url: 'https://test.tableau.com',
  credentials_encrypted: 'encrypted-credentials-data'
};

const testConnection2: CreateConnectionInput = {
  name: 'Test PowerBI Connection',
  bi_tool: 'powerbi',
  connection_url: 'https://test.powerbi.com',
  credentials_encrypted: 'encrypted-credentials-data-2'
};

// Test asset data
const testAsset1: CreateAssetInput = {
  connection_id: 1, // Will be updated after connection creation
  external_id: 'ext-report-1',
  name: 'Sales Report',
  description: 'Monthly sales reporting dashboard',
  asset_type: 'report',
  metadata: { source: 'tableau', version: '2.1' }
};

const testAsset2: CreateAssetInput = {
  connection_id: 1, // Will be updated after connection creation
  external_id: 'ext-dashboard-1',
  name: 'Executive Dashboard',
  description: 'High-level executive metrics',
  asset_type: 'dashboard',
  metadata: { source: 'tableau', version: '1.0' }
};

const testAsset3: CreateAssetInput = {
  connection_id: 2, // Will be updated after connection creation
  external_id: 'ext-datasource-1',
  name: 'Customer Database',
  description: null,
  asset_type: 'data_source',
  metadata: { source: 'powerbi', tables: ['customers', 'orders'] }
};

describe('getAssets', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no assets exist', async () => {
    const result = await getAssets();

    expect(result).toEqual([]);
  });

  it('should return all assets when no query provided', async () => {
    // Create test connections first
    const connection1 = await db.insert(connectionsTable)
      .values({
        name: testConnection.name,
        bi_tool: testConnection.bi_tool,
        connection_url: testConnection.connection_url,
        credentials_encrypted: testConnection.credentials_encrypted
      })
      .returning()
      .execute();

    const connection2 = await db.insert(connectionsTable)
      .values({
        name: testConnection2.name,
        bi_tool: testConnection2.bi_tool,
        connection_url: testConnection2.connection_url,
        credentials_encrypted: testConnection2.credentials_encrypted
      })
      .returning()
      .execute();

    // Create test assets
    await db.insert(assetsTable)
      .values([
        {
          ...testAsset1,
          connection_id: connection1[0].id
        },
        {
          ...testAsset2,
          connection_id: connection1[0].id
        },
        {
          ...testAsset3,
          connection_id: connection2[0].id
        }
      ])
      .execute();

    const result = await getAssets();

    expect(result).toHaveLength(3);
    expect(result[0].name).toEqual('Sales Report');
    expect(result[0].asset_type).toEqual('report');
    expect(result[0].external_id).toEqual('ext-report-1');
    expect(result[0].description).toEqual('Monthly sales reporting dashboard');
    expect(result[0].metadata).toEqual({ source: 'tableau', version: '2.1' });
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
    expect(result[0].id).toBeDefined();
  });

  it('should filter assets by connection_id', async () => {
    // Create test connections first
    const connection1 = await db.insert(connectionsTable)
      .values({
        name: testConnection.name,
        bi_tool: testConnection.bi_tool,
        connection_url: testConnection.connection_url,
        credentials_encrypted: testConnection.credentials_encrypted
      })
      .returning()
      .execute();

    const connection2 = await db.insert(connectionsTable)
      .values({
        name: testConnection2.name,
        bi_tool: testConnection2.bi_tool,
        connection_url: testConnection2.connection_url,
        credentials_encrypted: testConnection2.credentials_encrypted
      })
      .returning()
      .execute();

    // Create test assets
    await db.insert(assetsTable)
      .values([
        {
          ...testAsset1,
          connection_id: connection1[0].id
        },
        {
          ...testAsset2,
          connection_id: connection1[0].id
        },
        {
          ...testAsset3,
          connection_id: connection2[0].id
        }
      ])
      .execute();

    const query: GetAssetsQuery = {
      connection_id: connection1[0].id
    };

    const result = await getAssets(query);

    expect(result).toHaveLength(2);
    expect(result.every(asset => asset.connection_id === connection1[0].id)).toBe(true);
    expect(result.find(asset => asset.name === 'Sales Report')).toBeDefined();
    expect(result.find(asset => asset.name === 'Executive Dashboard')).toBeDefined();
  });

  it('should filter assets by asset_type', async () => {
    // Create test connection first
    const connection1 = await db.insert(connectionsTable)
      .values({
        name: testConnection.name,
        bi_tool: testConnection.bi_tool,
        connection_url: testConnection.connection_url,
        credentials_encrypted: testConnection.credentials_encrypted
      })
      .returning()
      .execute();

    const connection2 = await db.insert(connectionsTable)
      .values({
        name: testConnection2.name,
        bi_tool: testConnection2.bi_tool,
        connection_url: testConnection2.connection_url,
        credentials_encrypted: testConnection2.credentials_encrypted
      })
      .returning()
      .execute();

    // Create test assets
    await db.insert(assetsTable)
      .values([
        {
          ...testAsset1,
          connection_id: connection1[0].id
        },
        {
          ...testAsset2,
          connection_id: connection1[0].id
        },
        {
          ...testAsset3,
          connection_id: connection2[0].id
        }
      ])
      .execute();

    const query: GetAssetsQuery = {
      asset_type: 'report'
    };

    const result = await getAssets(query);

    expect(result).toHaveLength(1);
    expect(result[0].asset_type).toEqual('report');
    expect(result[0].name).toEqual('Sales Report');
  });

  it('should filter by both connection_id and asset_type', async () => {
    // Create test connections first
    const connection1 = await db.insert(connectionsTable)
      .values({
        name: testConnection.name,
        bi_tool: testConnection.bi_tool,
        connection_url: testConnection.connection_url,
        credentials_encrypted: testConnection.credentials_encrypted
      })
      .returning()
      .execute();

    const connection2 = await db.insert(connectionsTable)
      .values({
        name: testConnection2.name,
        bi_tool: testConnection2.bi_tool,
        connection_url: testConnection2.connection_url,
        credentials_encrypted: testConnection2.credentials_encrypted
      })
      .returning()
      .execute();

    // Create test assets including multiple reports for different connections
    await db.insert(assetsTable)
      .values([
        {
          ...testAsset1,
          connection_id: connection1[0].id
        },
        {
          ...testAsset2,
          connection_id: connection1[0].id
        },
        {
          ...testAsset3,
          connection_id: connection2[0].id
        },
        {
          connection_id: connection2[0].id,
          external_id: 'ext-report-2',
          name: 'PowerBI Report',
          description: 'Another report in PowerBI',
          asset_type: 'report',
          metadata: { source: 'powerbi' }
        }
      ])
      .execute();

    const query: GetAssetsQuery = {
      connection_id: connection2[0].id,
      asset_type: 'report'
    };

    const result = await getAssets(query);

    expect(result).toHaveLength(1);
    expect(result[0].connection_id).toEqual(connection2[0].id);
    expect(result[0].asset_type).toEqual('report');
    expect(result[0].name).toEqual('PowerBI Report');
  });

  it('should return empty array when filters match no assets', async () => {
    // Create test connection first
    const connection1 = await db.insert(connectionsTable)
      .values({
        name: testConnection.name,
        bi_tool: testConnection.bi_tool,
        connection_url: testConnection.connection_url,
        credentials_encrypted: testConnection.credentials_encrypted
      })
      .returning()
      .execute();

    // Create test asset
    await db.insert(assetsTable)
      .values({
        ...testAsset1,
        connection_id: connection1[0].id
      })
      .execute();

    const query: GetAssetsQuery = {
      connection_id: connection1[0].id,
      asset_type: 'data_source' // Asset is 'report' type
    };

    const result = await getAssets(query);

    expect(result).toEqual([]);
  });

  it('should handle non-existent connection_id gracefully', async () => {
    const query: GetAssetsQuery = {
      connection_id: 99999 // Non-existent connection ID
    };

    const result = await getAssets(query);

    expect(result).toEqual([]);
  });

  it('should preserve all asset fields correctly', async () => {
    // Create test connection first
    const connection1 = await db.insert(connectionsTable)
      .values({
        name: testConnection.name,
        bi_tool: testConnection.bi_tool,
        connection_url: testConnection.connection_url,
        credentials_encrypted: testConnection.credentials_encrypted
      })
      .returning()
      .execute();

    // Create test asset with all fields populated
    const fullAsset = {
      connection_id: connection1[0].id,
      external_id: 'ext-full-test',
      name: 'Full Test Asset',
      description: 'Complete asset with all fields',
      asset_type: 'dashboard' as const,
      metadata: { 
        source: 'tableau', 
        version: '3.0', 
        tags: ['finance', 'quarterly'],
        lastUpdated: '2024-01-01'
      }
    };

    await db.insert(assetsTable)
      .values(fullAsset)
      .execute();

    const result = await getAssets();

    expect(result).toHaveLength(1);
    const asset = result[0];
    
    expect(asset.connection_id).toEqual(connection1[0].id);
    expect(asset.external_id).toEqual('ext-full-test');
    expect(asset.name).toEqual('Full Test Asset');
    expect(asset.description).toEqual('Complete asset with all fields');
    expect(asset.asset_type).toEqual('dashboard');
    expect(asset.metadata).toEqual({
      source: 'tableau', 
      version: '3.0', 
      tags: ['finance', 'quarterly'],
      lastUpdated: '2024-01-01'
    });
    expect(asset.id).toBeDefined();
    expect(asset.created_at).toBeInstanceOf(Date);
    expect(asset.updated_at).toBeInstanceOf(Date);
  });
});