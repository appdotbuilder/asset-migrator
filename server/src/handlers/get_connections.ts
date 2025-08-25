import { db } from '../db';
import { connectionsTable } from '../db/schema';
import { type Connection, type GetConnectionsQuery } from '../schema';
import { eq, and, type SQL } from 'drizzle-orm';

export async function getConnections(query?: GetConnectionsQuery): Promise<Connection[]> {
  try {
    // Build conditions array for filtering
    const conditions: SQL<unknown>[] = [];

    if (query?.bi_tool) {
      conditions.push(eq(connectionsTable.bi_tool, query.bi_tool));
    }

    if (query?.status) {
      conditions.push(eq(connectionsTable.status, query.status));
    }

    // Build and execute query in one step
    let dbQuery = db.select().from(connectionsTable);
    
    if (conditions.length > 0) {
      const results = await dbQuery
        .where(conditions.length === 1 ? conditions[0] : and(...conditions))
        .execute();
      return results;
    }

    // Execute query without filters
    const results = await dbQuery.execute();
    return results;
  } catch (error) {
    console.error('Failed to fetch connections:', error);
    throw error;
  }
}