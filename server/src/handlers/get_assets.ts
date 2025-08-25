import { db } from '../db';
import { assetsTable, connectionsTable } from '../db/schema';
import { type Asset, type GetAssetsQuery } from '../schema';
import { eq, and, type SQL } from 'drizzle-orm';

export async function getAssets(query?: GetAssetsQuery): Promise<Asset[]> {
  try {
    // Start with base query
    let baseQuery = db.select().from(assetsTable);

    // Build conditions array for filtering
    const conditions: SQL<unknown>[] = [];

    if (query?.connection_id !== undefined) {
      conditions.push(eq(assetsTable.connection_id, query.connection_id));
    }

    if (query?.asset_type) {
      conditions.push(eq(assetsTable.asset_type, query.asset_type));
    }

    // Apply conditions if any exist
    const finalQuery = conditions.length > 0 
      ? baseQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions))
      : baseQuery;

    const results = await finalQuery.execute();

    // Convert results to match schema (no numeric conversions needed for this table)
    return results.map(asset => ({
      ...asset,
      created_at: asset.created_at as Date,
      updated_at: asset.updated_at as Date,
      metadata: asset.metadata as Record<string, any>
    }));
  } catch (error) {
    console.error('Asset retrieval failed:', error);
    throw error;
  }
}