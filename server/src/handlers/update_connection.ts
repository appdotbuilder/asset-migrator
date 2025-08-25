import { db } from '../db';
import { connectionsTable } from '../db/schema';
import { type UpdateConnectionInput, type Connection } from '../schema';
import { eq } from 'drizzle-orm';

export const updateConnection = async (input: UpdateConnectionInput): Promise<Connection> => {
  try {
    // First, check if the connection exists
    const existingConnection = await db.select()
      .from(connectionsTable)
      .where(eq(connectionsTable.id, input.id))
      .execute();

    if (existingConnection.length === 0) {
      throw new Error(`Connection with id ${input.id} not found`);
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.name !== undefined) {
      updateData.name = input.name;
    }

    if (input.connection_url !== undefined) {
      updateData.connection_url = input.connection_url;
    }

    if (input.credentials_encrypted !== undefined) {
      updateData.credentials_encrypted = input.credentials_encrypted;
    }

    if (input.status !== undefined) {
      updateData.status = input.status;
    }

    // Update the connection
    const result = await db.update(connectionsTable)
      .set(updateData)
      .where(eq(connectionsTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Connection update failed:', error);
    throw error;
  }
};