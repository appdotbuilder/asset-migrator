import { db } from '../db';
import { connectionsTable } from '../db/schema';
import { type CreateConnectionInput, type Connection } from '../schema';

export const createConnection = async (input: CreateConnectionInput): Promise<Connection> => {
  try {
    // Insert connection record
    const result = await db.insert(connectionsTable)
      .values({
        name: input.name,
        bi_tool: input.bi_tool,
        connection_url: input.connection_url,
        credentials_encrypted: input.credentials_encrypted,
        status: 'inactive' // Default status for new connections
      })
      .returning()
      .execute();

    const connection = result[0];
    return connection;
  } catch (error) {
    console.error('Connection creation failed:', error);
    throw error;
  }
};