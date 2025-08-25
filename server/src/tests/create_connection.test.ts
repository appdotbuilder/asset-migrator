import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { connectionsTable } from '../db/schema';
import { type CreateConnectionInput } from '../schema';
import { createConnection } from '../handlers/create_connection';
import { eq } from 'drizzle-orm';

// Test input data
const testInput: CreateConnectionInput = {
  name: 'Test Tableau Connection',
  bi_tool: 'tableau',
  connection_url: 'https://tableau.example.com',
  credentials_encrypted: 'encrypted_credentials_string'
};

const testPowerBIInput: CreateConnectionInput = {
  name: 'Test PowerBI Connection',
  bi_tool: 'powerbi',
  connection_url: 'https://powerbi.example.com',
  credentials_encrypted: 'encrypted_powerbi_credentials'
};

const testLookerInput: CreateConnectionInput = {
  name: 'Test Looker Connection',
  bi_tool: 'looker',
  connection_url: 'https://looker.example.com',
  credentials_encrypted: 'encrypted_looker_credentials'
};

describe('createConnection', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a connection with all required fields', async () => {
    const result = await createConnection(testInput);

    // Basic field validation
    expect(result.name).toEqual('Test Tableau Connection');
    expect(result.bi_tool).toEqual('tableau');
    expect(result.connection_url).toEqual('https://tableau.example.com');
    expect(result.credentials_encrypted).toEqual('encrypted_credentials_string');
    expect(result.status).toEqual('inactive');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.last_sync_at).toBeNull();
  });

  it('should save connection to database', async () => {
    const result = await createConnection(testInput);

    // Query the database to verify the connection was saved
    const connections = await db.select()
      .from(connectionsTable)
      .where(eq(connectionsTable.id, result.id))
      .execute();

    expect(connections).toHaveLength(1);
    expect(connections[0].name).toEqual('Test Tableau Connection');
    expect(connections[0].bi_tool).toEqual('tableau');
    expect(connections[0].connection_url).toEqual('https://tableau.example.com');
    expect(connections[0].credentials_encrypted).toEqual('encrypted_credentials_string');
    expect(connections[0].status).toEqual('inactive');
    expect(connections[0].created_at).toBeInstanceOf(Date);
    expect(connections[0].updated_at).toBeInstanceOf(Date);
    expect(connections[0].last_sync_at).toBeNull();
  });

  it('should create PowerBI connection successfully', async () => {
    const result = await createConnection(testPowerBIInput);

    expect(result.name).toEqual('Test PowerBI Connection');
    expect(result.bi_tool).toEqual('powerbi');
    expect(result.connection_url).toEqual('https://powerbi.example.com');
    expect(result.credentials_encrypted).toEqual('encrypted_powerbi_credentials');
    expect(result.status).toEqual('inactive');
    expect(result.id).toBeDefined();
  });

  it('should create Looker connection successfully', async () => {
    const result = await createConnection(testLookerInput);

    expect(result.name).toEqual('Test Looker Connection');
    expect(result.bi_tool).toEqual('looker');
    expect(result.connection_url).toEqual('https://looker.example.com');
    expect(result.credentials_encrypted).toEqual('encrypted_looker_credentials');
    expect(result.status).toEqual('inactive');
    expect(result.id).toBeDefined();
  });

  it('should create multiple connections with unique IDs', async () => {
    const result1 = await createConnection(testInput);
    const result2 = await createConnection(testPowerBIInput);
    const result3 = await createConnection(testLookerInput);

    // Verify all connections have unique IDs
    expect(result1.id).not.toEqual(result2.id);
    expect(result1.id).not.toEqual(result3.id);
    expect(result2.id).not.toEqual(result3.id);

    // Verify all connections are in the database
    const allConnections = await db.select()
      .from(connectionsTable)
      .execute();

    expect(allConnections).toHaveLength(3);
    
    // Verify each connection has the correct data
    const tableauConnection = allConnections.find(c => c.bi_tool === 'tableau');
    const powerbiConnection = allConnections.find(c => c.bi_tool === 'powerbi');
    const lookerConnection = allConnections.find(c => c.bi_tool === 'looker');

    expect(tableauConnection).toBeDefined();
    expect(powerbiConnection).toBeDefined();
    expect(lookerConnection).toBeDefined();

    expect(tableauConnection?.name).toEqual('Test Tableau Connection');
    expect(powerbiConnection?.name).toEqual('Test PowerBI Connection');
    expect(lookerConnection?.name).toEqual('Test Looker Connection');
  });

  it('should set correct timestamps', async () => {
    const beforeCreation = new Date();
    const result = await createConnection(testInput);
    const afterCreation = new Date();

    // Verify timestamps are within reasonable range
    expect(result.created_at >= beforeCreation).toBe(true);
    expect(result.created_at <= afterCreation).toBe(true);
    expect(result.updated_at >= beforeCreation).toBe(true);
    expect(result.updated_at <= afterCreation).toBe(true);
    
    // Verify last_sync_at is null for new connections
    expect(result.last_sync_at).toBeNull();
  });

  it('should handle database errors gracefully', async () => {
    // Create a connection input with invalid data that would cause a database error
    const invalidInput = {
      ...testInput,
      bi_tool: 'invalid_tool' as any // This will cause a database constraint error
    };

    // Expect the function to throw an error
    await expect(createConnection(invalidInput)).rejects.toThrow();
  });
});