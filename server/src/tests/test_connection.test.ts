import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { connectionsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { testConnection } from '../handlers/test_connection';

describe('testConnection', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return connection not found for non-existent connection', async () => {
    const result = await testConnection(999);

    expect(result.success).toBe(false);
    expect(result.message).toEqual('Connection not found');
  });

  it('should successfully test a valid connection', async () => {
    // Create a test connection
    const [connection] = await db.insert(connectionsTable)
      .values({
        name: 'Test Tableau Connection',
        bi_tool: 'tableau',
        connection_url: 'https://tableau.example.com',
        credentials_encrypted: 'encrypted_creds_123',
        status: 'inactive'
      })
      .returning()
      .execute();

    const result = await testConnection(connection.id);

    expect(result.success).toBe(true);
    expect(result.message).toContain('Successfully connected to tableau');
    expect(result.message).toContain('https://tableau.example.com');

    // Verify connection status was updated to active
    const updatedConnections = await db.select()
      .from(connectionsTable)
      .where(eq(connectionsTable.id, connection.id))
      .execute();

    expect(updatedConnections[0].status).toEqual('active');
    expect(updatedConnections[0].last_sync_at).toBeInstanceOf(Date);
  });

  it('should handle connection in error status', async () => {
    // Create a connection with error status
    const [connection] = await db.insert(connectionsTable)
      .values({
        name: 'Error Connection',
        bi_tool: 'powerbi',
        connection_url: 'https://powerbi.example.com',
        credentials_encrypted: 'encrypted_creds_456',
        status: 'error'
      })
      .returning()
      .execute();

    const result = await testConnection(connection.id);

    expect(result.success).toBe(false);
    expect(result.message).toEqual('Connection is in error state');
  });

  it('should handle invalid connection URL', async () => {
    // Create connection with invalid URL
    const [connection] = await db.insert(connectionsTable)
      .values({
        name: 'Invalid URL Connection',
        bi_tool: 'looker',
        connection_url: 'not-a-valid-url',
        credentials_encrypted: 'encrypted_creds_789',
        status: 'inactive'
      })
      .returning()
      .execute();

    const result = await testConnection(connection.id);

    expect(result.success).toBe(false);
    expect(result.message).toEqual('Invalid connection URL');

    // Verify connection status was updated to error
    const updatedConnections = await db.select()
      .from(connectionsTable)
      .where(eq(connectionsTable.id, connection.id))
      .execute();

    expect(updatedConnections[0].status).toEqual('error');
  });

  it('should handle missing credentials', async () => {
    // Create connection with empty credentials
    const [connection] = await db.insert(connectionsTable)
      .values({
        name: 'No Credentials Connection',
        bi_tool: 'tableau',
        connection_url: 'https://tableau.example.com',
        credentials_encrypted: '',
        status: 'inactive'
      })
      .returning()
      .execute();

    const result = await testConnection(connection.id);

    expect(result.success).toBe(false);
    expect(result.message).toEqual('Missing or invalid credentials');

    // Verify connection status was updated to error
    const updatedConnections = await db.select()
      .from(connectionsTable)
      .where(eq(connectionsTable.id, connection.id))
      .execute();

    expect(updatedConnections[0].status).toEqual('error');
  });

  it('should handle authentication failure simulation', async () => {
    // Create connection with 'invalid' in name to trigger auth failure simulation
    const [connection] = await db.insert(connectionsTable)
      .values({
        name: 'Invalid Auth Connection',
        bi_tool: 'powerbi',
        connection_url: 'https://powerbi.example.com',
        credentials_encrypted: 'invalid_creds',
        status: 'inactive'
      })
      .returning()
      .execute();

    const result = await testConnection(connection.id);

    expect(result.success).toBe(false);
    expect(result.message).toEqual('Authentication failed');

    // Verify connection status was updated to error
    const updatedConnections = await db.select()
      .from(connectionsTable)
      .where(eq(connectionsTable.id, connection.id))
      .execute();

    expect(updatedConnections[0].status).toEqual('error');
  });

  it('should handle network failure simulation', async () => {
    // Create connection with 'network' in name to trigger network failure simulation
    const [connection] = await db.insert(connectionsTable)
      .values({
        name: 'Network Failure Connection',
        bi_tool: 'looker',
        connection_url: 'https://looker.example.com',
        credentials_encrypted: 'valid_creds',
        status: 'inactive'
      })
      .returning()
      .execute();

    const result = await testConnection(connection.id);

    expect(result.success).toBe(false);
    expect(result.message).toEqual('Network connection failed');

    // Verify connection status was updated to error
    const updatedConnections = await db.select()
      .from(connectionsTable)
      .where(eq(connectionsTable.id, connection.id))
      .execute();

    expect(updatedConnections[0].status).toEqual('error');
  });

  it('should handle timeout simulation', async () => {
    // Create connection with 'timeout' in name to trigger timeout simulation
    const [connection] = await db.insert(connectionsTable)
      .values({
        name: 'Timeout Connection',
        bi_tool: 'tableau',
        connection_url: 'https://tableau.example.com',
        credentials_encrypted: 'valid_creds',
        status: 'inactive'
      })
      .returning()
      .execute();

    const result = await testConnection(connection.id);

    expect(result.success).toBe(false);
    expect(result.message).toEqual('Connection timeout');

    // Verify connection status was updated to error
    const updatedConnections = await db.select()
      .from(connectionsTable)
      .where(eq(connectionsTable.id, connection.id))
      .execute();

    expect(updatedConnections[0].status).toEqual('error');
  });

  it('should test connections for different BI tools', async () => {
    // Test Tableau connection
    const [tableauConnection] = await db.insert(connectionsTable)
      .values({
        name: 'Tableau Connection',
        bi_tool: 'tableau',
        connection_url: 'https://tableau.example.com',
        credentials_encrypted: 'tableau_creds',
        status: 'inactive'
      })
      .returning()
      .execute();

    // Test PowerBI connection
    const [powerbiConnection] = await db.insert(connectionsTable)
      .values({
        name: 'PowerBI Connection',
        bi_tool: 'powerbi',
        connection_url: 'https://powerbi.microsoft.com',
        credentials_encrypted: 'powerbi_creds',
        status: 'inactive'
      })
      .returning()
      .execute();

    // Test Looker connection
    const [lookerConnection] = await db.insert(connectionsTable)
      .values({
        name: 'Looker Connection',
        bi_tool: 'looker',
        connection_url: 'https://looker.example.com',
        credentials_encrypted: 'looker_creds',
        status: 'inactive'
      })
      .returning()
      .execute();

    // Test all connections
    const tableauResult = await testConnection(tableauConnection.id);
    const powerbiResult = await testConnection(powerbiConnection.id);
    const lookerResult = await testConnection(lookerConnection.id);

    expect(tableauResult.success).toBe(true);
    expect(tableauResult.message).toContain('tableau');

    expect(powerbiResult.success).toBe(true);
    expect(powerbiResult.message).toContain('powerbi');

    expect(lookerResult.success).toBe(true);
    expect(lookerResult.message).toContain('looker');

    // Verify all connections were updated to active
    const allConnections = await db.select()
      .from(connectionsTable)
      .execute();

    const activeConnections = allConnections.filter(conn => conn.status === 'active');
    expect(activeConnections).toHaveLength(3);
    
    // Verify all have last_sync_at timestamps
    activeConnections.forEach(conn => {
      expect(conn.last_sync_at).toBeInstanceOf(Date);
    });
  });
});