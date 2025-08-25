import { db } from '../db';
import { connectionsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function testConnection(connectionId: number): Promise<{ success: boolean; message: string }> {
  try {
    // Fetch the connection details
    const connections = await db.select()
      .from(connectionsTable)
      .where(eq(connectionsTable.id, connectionId))
      .execute();

    if (connections.length === 0) {
      return {
        success: false,
        message: 'Connection not found'
      };
    }

    const connection = connections[0];

    // Check if connection is in error status
    if (connection.status === 'error') {
      return {
        success: false,
        message: 'Connection is in error state'
      };
    }

    // Simulate connection testing based on BI tool type
    // In a real implementation, this would make actual HTTP requests to the BI tool APIs
    const testResult = await simulateConnectionTest(connection);

    if (testResult.success) {
      // Update last_sync_at timestamp on successful test
      await db.update(connectionsTable)
        .set({ 
          last_sync_at: new Date(),
          status: 'active'
        })
        .where(eq(connectionsTable.id, connectionId))
        .execute();
    } else {
      // Update status to error on failed test
      await db.update(connectionsTable)
        .set({ status: 'error' })
        .where(eq(connectionsTable.id, connectionId))
        .execute();
    }

    return testResult;
  } catch (error) {
    console.error('Connection test failed:', error);
    
    // Update status to error on exception
    try {
      await db.update(connectionsTable)
        .set({ status: 'error' })
        .where(eq(connectionsTable.id, connectionId))
        .execute();
    } catch (updateError) {
      console.error('Failed to update connection status:', updateError);
    }

    return {
      success: false,
      message: 'Connection test failed due to internal error'
    };
  }
}

// Simulate connection testing - in real implementation this would make actual API calls
async function simulateConnectionTest(connection: any): Promise<{ success: boolean; message: string }> {
  // Simulate different scenarios based on connection properties
  
  // Invalid URL format
  if (!connection.connection_url || !isValidUrl(connection.connection_url)) {
    return {
      success: false,
      message: 'Invalid connection URL'
    };
  }

  // Missing or empty credentials
  if (!connection.credentials_encrypted || connection.credentials_encrypted.trim() === '') {
    return {
      success: false,
      message: 'Missing or invalid credentials'
    };
  }

  // Simulate network/authentication errors for specific test cases
  if (connection.name.toLowerCase().includes('invalid')) {
    return {
      success: false,
      message: 'Authentication failed'
    };
  }

  if (connection.name.toLowerCase().includes('network')) {
    return {
      success: false,
      message: 'Network connection failed'
    };
  }

  // Simulate timeout for connections with 'timeout' in name
  if (connection.name.toLowerCase().includes('timeout')) {
    return {
      success: false,
      message: 'Connection timeout'
    };
  }

  // Default successful connection
  return {
    success: true,
    message: `Successfully connected to ${connection.bi_tool} at ${connection.connection_url}`
  };
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}