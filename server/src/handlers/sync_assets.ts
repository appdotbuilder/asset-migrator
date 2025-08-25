import { db } from '../db';
import { connectionsTable, assetsTable } from '../db/schema';
import { type Asset } from '../schema';
import { eq } from 'drizzle-orm';

export const syncAssets = async (connectionId: number): Promise<Asset[]> => {
  try {
    // Verify connection exists and is active
    const connection = await db.select()
      .from(connectionsTable)
      .where(eq(connectionsTable.id, connectionId))
      .execute();

    if (connection.length === 0) {
      throw new Error(`Connection with ID ${connectionId} not found`);
    }

    if (connection[0].status !== 'active') {
      throw new Error(`Connection ${connectionId} is not active. Status: ${connection[0].status}`);
    }

    // Mock sync process - in real implementation, this would:
    // 1. Connect to the BI tool using connection credentials
    // 2. Fetch available assets (reports, dashboards, data sources)
    // 3. Compare with existing assets in database
    // 4. Insert new assets and update existing ones
    
    const mockAssets = [
      {
        connection_id: connectionId,
        external_id: `ext_${Date.now()}_report_1`,
        name: `Synced Report ${Date.now()}`,
        description: 'A report synced from the BI tool',
        asset_type: 'report' as const,
        metadata: {
          owner: 'system',
          last_modified: new Date().toISOString(),
          source_url: `${connection[0].connection_url}/reports/1`
        }
      },
      {
        connection_id: connectionId,
        external_id: `ext_${Date.now()}_dashboard_1`,
        name: `Synced Dashboard ${Date.now()}`,
        description: 'A dashboard synced from the BI tool',
        asset_type: 'dashboard' as const,
        metadata: {
          owner: 'system',
          last_modified: new Date().toISOString(),
          source_url: `${connection[0].connection_url}/dashboards/1`
        }
      }
    ];

    // Insert new assets
    const results = await db.insert(assetsTable)
      .values(mockAssets)
      .returning()
      .execute();

    // Update connection's last_sync_at timestamp
    await db.update(connectionsTable)
      .set({ 
        last_sync_at: new Date(),
        updated_at: new Date()
      })
      .where(eq(connectionsTable.id, connectionId))
      .execute();

    // Convert metadata from unknown to Record<string, any> for proper typing
    return results.map(asset => ({
      ...asset,
      metadata: asset.metadata as Record<string, any>
    }));
  } catch (error) {
    console.error('Asset sync failed:', error);
    throw error;
  }
};