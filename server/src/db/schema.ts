import { serial, text, pgTable, timestamp, integer, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Define PostgreSQL enums
export const biToolEnum = pgEnum('bi_tool', ['tableau', 'powerbi', 'looker']);
export const assetTypeEnum = pgEnum('asset_type', ['report', 'dashboard', 'data_source']);
export const databricksAssetTypeEnum = pgEnum('databricks_asset_type', ['unity_catalog_metric_view', 'ai_bi_dashboard', 'ai_bi_genie_space']);
export const connectionStatusEnum = pgEnum('connection_status', ['active', 'inactive', 'error']);
export const migrationStatusEnum = pgEnum('migration_status', ['pending', 'in_progress', 'completed', 'failed', 'cancelled']);

// Connections table for BI tool connections
export const connectionsTable = pgTable('connections', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  bi_tool: biToolEnum('bi_tool').notNull(),
  connection_url: text('connection_url').notNull(),
  credentials_encrypted: text('credentials_encrypted').notNull(),
  status: connectionStatusEnum('status').notNull().default('inactive'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  last_sync_at: timestamp('last_sync_at')
});

// Assets table for source system assets
export const assetsTable = pgTable('assets', {
  id: serial('id').primaryKey(),
  connection_id: integer('connection_id').notNull(),
  external_id: text('external_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  asset_type: assetTypeEnum('asset_type').notNull(),
  metadata: jsonb('metadata').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Migration jobs table
export const migrationJobsTable = pgTable('migration_jobs', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  source_asset_ids: jsonb('source_asset_ids').notNull(), // Array of asset IDs
  target_databricks_asset_type: databricksAssetTypeEnum('target_databricks_asset_type').notNull(),
  status: migrationStatusEnum('status').notNull().default('pending'),
  transformation_config: jsonb('transformation_config'),
  mapping_config: jsonb('mapping_config'),
  error_message: text('error_message'),
  progress_percentage: integer('progress_percentage').notNull().default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  started_at: timestamp('started_at'),
  completed_at: timestamp('completed_at')
});

// Migration history table for tracking status changes
export const migrationHistoryTable = pgTable('migration_history', {
  id: serial('id').primaryKey(),
  migration_job_id: integer('migration_job_id').notNull(),
  status: migrationStatusEnum('status').notNull(),
  message: text('message'),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Define relationships
export const connectionsRelations = relations(connectionsTable, ({ many }) => ({
  assets: many(assetsTable)
}));

export const assetsRelations = relations(assetsTable, ({ one }) => ({
  connection: one(connectionsTable, {
    fields: [assetsTable.connection_id],
    references: [connectionsTable.id]
  })
}));

export const migrationJobsRelations = relations(migrationJobsTable, ({ many }) => ({
  history: many(migrationHistoryTable)
}));

export const migrationHistoryRelations = relations(migrationHistoryTable, ({ one }) => ({
  migrationJob: one(migrationJobsTable, {
    fields: [migrationHistoryTable.migration_job_id],
    references: [migrationJobsTable.id]
  })
}));

// TypeScript types for the table schemas
export type Connection = typeof connectionsTable.$inferSelect;
export type NewConnection = typeof connectionsTable.$inferInsert;
export type Asset = typeof assetsTable.$inferSelect;
export type NewAsset = typeof assetsTable.$inferInsert;
export type MigrationJob = typeof migrationJobsTable.$inferSelect;
export type NewMigrationJob = typeof migrationJobsTable.$inferInsert;
export type MigrationHistory = typeof migrationHistoryTable.$inferSelect;
export type NewMigrationHistory = typeof migrationHistoryTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = {
  connections: connectionsTable,
  assets: assetsTable,
  migrationJobs: migrationJobsTable,
  migrationHistory: migrationHistoryTable
};