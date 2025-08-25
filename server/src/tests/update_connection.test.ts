import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { connectionsTable } from '../db/schema';
import { type UpdateConnectionInput, type CreateConnectionInput } from '../schema';
import { updateConnection } from '../handlers/update_connection';
import { eq } from 'drizzle-orm';

// Helper function to create a test connection
const createTestConnection = async (): Promise<number> => {
  const testConnectionData: CreateConnectionInput = {
    name: 'Test Connection',
    bi_tool: 'tableau',
    connection_url: 'https://tableau.example.com',
    credentials_encrypted: 'original_encrypted_data'
  };

  const result = await db.insert(connectionsTable)
    .values({
      ...testConnectionData,
      status: 'inactive'
    })
    .returning()
    .execute();

  return result[0].id;
};

describe('updateConnection', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update connection name', async () => {
    const connectionId = await createTestConnection();

    const updateInput: UpdateConnectionInput = {
      id: connectionId,
      name: 'Updated Connection Name'
    };

    const result = await updateConnection(updateInput);

    expect(result.id).toEqual(connectionId);
    expect(result.name).toEqual('Updated Connection Name');
    expect(result.bi_tool).toEqual('tableau');
    expect(result.connection_url).toEqual('https://tableau.example.com');
    expect(result.credentials_encrypted).toEqual('original_encrypted_data');
    expect(result.status).toEqual('inactive');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update connection URL', async () => {
    const connectionId = await createTestConnection();

    const updateInput: UpdateConnectionInput = {
      id: connectionId,
      connection_url: 'https://new-tableau.example.com'
    };

    const result = await updateConnection(updateInput);

    expect(result.id).toEqual(connectionId);
    expect(result.name).toEqual('Test Connection');
    expect(result.connection_url).toEqual('https://new-tableau.example.com');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update connection credentials', async () => {
    const connectionId = await createTestConnection();

    const updateInput: UpdateConnectionInput = {
      id: connectionId,
      credentials_encrypted: 'new_encrypted_credentials'
    };

    const result = await updateConnection(updateInput);

    expect(result.id).toEqual(connectionId);
    expect(result.credentials_encrypted).toEqual('new_encrypted_credentials');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update connection status', async () => {
    const connectionId = await createTestConnection();

    const updateInput: UpdateConnectionInput = {
      id: connectionId,
      status: 'active'
    };

    const result = await updateConnection(updateInput);

    expect(result.id).toEqual(connectionId);
    expect(result.status).toEqual('active');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update multiple fields at once', async () => {
    const connectionId = await createTestConnection();

    const updateInput: UpdateConnectionInput = {
      id: connectionId,
      name: 'Multi-Update Connection',
      connection_url: 'https://multi-update.example.com',
      status: 'active'
    };

    const result = await updateConnection(updateInput);

    expect(result.id).toEqual(connectionId);
    expect(result.name).toEqual('Multi-Update Connection');
    expect(result.connection_url).toEqual('https://multi-update.example.com');
    expect(result.status).toEqual('active');
    expect(result.credentials_encrypted).toEqual('original_encrypted_data'); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save changes to database', async () => {
    const connectionId = await createTestConnection();

    const updateInput: UpdateConnectionInput = {
      id: connectionId,
      name: 'Database Updated Connection',
      status: 'active'
    };

    await updateConnection(updateInput);

    // Verify changes are persisted in database
    const connections = await db.select()
      .from(connectionsTable)
      .where(eq(connectionsTable.id, connectionId))
      .execute();

    expect(connections).toHaveLength(1);
    expect(connections[0].name).toEqual('Database Updated Connection');
    expect(connections[0].status).toEqual('active');
    expect(connections[0].updated_at).toBeInstanceOf(Date);
  });

  it('should always update the updated_at timestamp', async () => {
    const connectionId = await createTestConnection();

    // Get original timestamp
    const originalConnection = await db.select()
      .from(connectionsTable)
      .where(eq(connectionsTable.id, connectionId))
      .execute();

    const originalUpdatedAt = originalConnection[0].updated_at;

    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateConnectionInput = {
      id: connectionId,
      name: 'Timestamp Test Connection'
    };

    const result = await updateConnection(updateInput);

    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should throw error when connection does not exist', async () => {
    const nonExistentId = 99999;

    const updateInput: UpdateConnectionInput = {
      id: nonExistentId,
      name: 'Non-existent Connection'
    };

    await expect(updateConnection(updateInput))
      .rejects
      .toThrow(/Connection with id 99999 not found/i);
  });

  it('should handle partial updates without affecting other fields', async () => {
    const connectionId = await createTestConnection();

    // Update only the status
    const updateInput: UpdateConnectionInput = {
      id: connectionId,
      status: 'error'
    };

    const result = await updateConnection(updateInput);

    // All other fields should remain unchanged
    expect(result.name).toEqual('Test Connection');
    expect(result.bi_tool).toEqual('tableau');
    expect(result.connection_url).toEqual('https://tableau.example.com');
    expect(result.credentials_encrypted).toEqual('original_encrypted_data');
    expect(result.status).toEqual('error'); // Only this should change
  });

  it('should handle updating to different status values', async () => {
    const connectionId = await createTestConnection();

    // Test each possible status value
    const statusValues = ['active', 'inactive', 'error'] as const;

    for (const status of statusValues) {
      const updateInput: UpdateConnectionInput = {
        id: connectionId,
        status: status
      };

      const result = await updateConnection(updateInput);
      expect(result.status).toEqual(status);
    }
  });
});