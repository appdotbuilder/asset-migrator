import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { connectionsTable } from '../db/schema';
import { type CreateConnectionInput } from '../schema';
import { getConnections } from '../handlers/get_connections';

// Test connection data
const testConnections: CreateConnectionInput[] = [
  {
    name: 'Tableau Production',
    bi_tool: 'tableau',
    connection_url: 'https://tableau.company.com',
    credentials_encrypted: 'encrypted_tableau_creds'
  },
  {
    name: 'PowerBI Dev',
    bi_tool: 'powerbi',
    connection_url: 'https://powerbi.company.com',
    credentials_encrypted: 'encrypted_powerbi_creds'
  },
  {
    name: 'Looker Analytics',
    bi_tool: 'looker',
    connection_url: 'https://looker.company.com',
    credentials_encrypted: 'encrypted_looker_creds'
  }
];

describe('getConnections', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no connections exist', async () => {
    const result = await getConnections();

    expect(result).toEqual([]);
  });

  it('should return all connections when no filters are provided', async () => {
    // Create test connections
    await db.insert(connectionsTable)
      .values([
        {
          ...testConnections[0],
          status: 'active'
        },
        {
          ...testConnections[1],
          status: 'inactive'
        },
        {
          ...testConnections[2],
          status: 'error'
        }
      ])
      .execute();

    const result = await getConnections();

    expect(result).toHaveLength(3);
    expect(result.map(c => c.name)).toEqual(
      expect.arrayContaining(['Tableau Production', 'PowerBI Dev', 'Looker Analytics'])
    );
    
    // Verify all required fields are present
    result.forEach(connection => {
      expect(connection.id).toBeDefined();
      expect(connection.name).toBeDefined();
      expect(connection.bi_tool).toBeDefined();
      expect(connection.connection_url).toBeDefined();
      expect(connection.credentials_encrypted).toBeDefined();
      expect(connection.status).toBeDefined();
      expect(connection.created_at).toBeInstanceOf(Date);
      expect(connection.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should filter connections by bi_tool', async () => {
    // Create test connections
    await db.insert(connectionsTable)
      .values([
        {
          ...testConnections[0],
          status: 'active'
        },
        {
          ...testConnections[1],
          status: 'active'
        },
        {
          ...testConnections[2],
          status: 'active'
        }
      ])
      .execute();

    const result = await getConnections({ bi_tool: 'tableau' });

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Tableau Production');
    expect(result[0].bi_tool).toEqual('tableau');
  });

  it('should filter connections by status', async () => {
    // Create test connections with different statuses
    await db.insert(connectionsTable)
      .values([
        {
          ...testConnections[0],
          status: 'active'
        },
        {
          ...testConnections[1],
          status: 'inactive'
        },
        {
          ...testConnections[2],
          status: 'active'
        }
      ])
      .execute();

    const result = await getConnections({ status: 'active' });

    expect(result).toHaveLength(2);
    result.forEach(connection => {
      expect(connection.status).toEqual('active');
    });
    expect(result.map(c => c.name)).toEqual(
      expect.arrayContaining(['Tableau Production', 'Looker Analytics'])
    );
  });

  it('should filter connections by both bi_tool and status', async () => {
    // Create test connections with various combinations
    await db.insert(connectionsTable)
      .values([
        {
          ...testConnections[0],
          status: 'active'
        },
        {
          name: 'Tableau Dev',
          bi_tool: 'tableau',
          connection_url: 'https://tableau-dev.company.com',
          credentials_encrypted: 'encrypted_tableau_dev_creds',
          status: 'inactive'
        },
        {
          ...testConnections[1],
          status: 'active'
        },
        {
          ...testConnections[2],
          status: 'error'
        }
      ])
      .execute();

    const result = await getConnections({ bi_tool: 'tableau', status: 'active' });

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Tableau Production');
    expect(result[0].bi_tool).toEqual('tableau');
    expect(result[0].status).toEqual('active');
  });

  it('should return empty array when filters match no connections', async () => {
    // Create test connections
    await db.insert(connectionsTable)
      .values([
        {
          ...testConnections[0],
          status: 'active'
        },
        {
          ...testConnections[1],
          status: 'inactive'
        }
      ])
      .execute();

    const result = await getConnections({ bi_tool: 'looker', status: 'active' });

    expect(result).toEqual([]);
  });

  it('should handle null last_sync_at field correctly', async () => {
    // Create connection without last_sync_at (should be null by default)
    await db.insert(connectionsTable)
      .values([
        {
          ...testConnections[0],
          status: 'active'
        }
      ])
      .execute();

    const result = await getConnections();

    expect(result).toHaveLength(1);
    expect(result[0].last_sync_at).toBeNull();
  });

  it('should verify connection URLs are properly stored and retrieved', async () => {
    await db.insert(connectionsTable)
      .values([testConnections[0]])
      .execute();

    const result = await getConnections();

    expect(result).toHaveLength(1);
    expect(result[0].connection_url).toEqual('https://tableau.company.com');
    expect(result[0].credentials_encrypted).toEqual('encrypted_tableau_creds');
  });

  it('should handle all valid bi_tool enum values', async () => {
    // Create connections for all bi_tool types
    await db.insert(connectionsTable)
      .values([
        {
          ...testConnections[0], // tableau
          status: 'active'
        },
        {
          ...testConnections[1], // powerbi
          status: 'active'
        },
        {
          ...testConnections[2], // looker
          status: 'active'
        }
      ])
      .execute();

    // Test each bi_tool filter
    const tableauResult = await getConnections({ bi_tool: 'tableau' });
    const powerbiResult = await getConnections({ bi_tool: 'powerbi' });
    const lookerResult = await getConnections({ bi_tool: 'looker' });

    expect(tableauResult).toHaveLength(1);
    expect(tableauResult[0].bi_tool).toEqual('tableau');

    expect(powerbiResult).toHaveLength(1);
    expect(powerbiResult[0].bi_tool).toEqual('powerbi');

    expect(lookerResult).toHaveLength(1);
    expect(lookerResult[0].bi_tool).toEqual('looker');
  });

  it('should handle all valid status enum values', async () => {
    // Create connections with all status types
    await db.insert(connectionsTable)
      .values([
        {
          ...testConnections[0],
          status: 'active'
        },
        {
          ...testConnections[1],
          status: 'inactive'
        },
        {
          ...testConnections[2],
          status: 'error'
        }
      ])
      .execute();

    // Test each status filter
    const activeResult = await getConnections({ status: 'active' });
    const inactiveResult = await getConnections({ status: 'inactive' });
    const errorResult = await getConnections({ status: 'error' });

    expect(activeResult).toHaveLength(1);
    expect(activeResult[0].status).toEqual('active');

    expect(inactiveResult).toHaveLength(1);
    expect(inactiveResult[0].status).toEqual('inactive');

    expect(errorResult).toHaveLength(1);
    expect(errorResult[0].status).toEqual('error');
  });
});