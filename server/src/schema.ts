import { z } from 'zod';

// Enums for various system types and statuses
export const biToolEnum = z.enum(['tableau', 'powerbi', 'looker']);
export const assetTypeEnum = z.enum(['report', 'dashboard', 'data_source']);
export const databricksAssetTypeEnum = z.enum(['unity_catalog_metric_view', 'ai_bi_dashboard', 'ai_bi_genie_space']);
export const connectionStatusEnum = z.enum(['active', 'inactive', 'error']);
export const migrationStatusEnum = z.enum(['pending', 'in_progress', 'completed', 'failed', 'cancelled']);

// Connection schema for BI tools
export const connectionSchema = z.object({
  id: z.number(),
  name: z.string(),
  bi_tool: biToolEnum,
  connection_url: z.string().url(),
  credentials_encrypted: z.string(), // Encrypted connection credentials
  status: connectionStatusEnum,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  last_sync_at: z.coerce.date().nullable()
});

export type Connection = z.infer<typeof connectionSchema>;

// Asset schema for source system assets
export const assetSchema = z.object({
  id: z.number(),
  connection_id: z.number(),
  external_id: z.string(), // ID in the source system
  name: z.string(),
  description: z.string().nullable(),
  asset_type: assetTypeEnum,
  metadata: z.record(z.any()), // JSON metadata from source system
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Asset = z.infer<typeof assetSchema>;

// Migration job schema
export const migrationJobSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  source_asset_ids: z.array(z.number()), // Array of asset IDs to migrate
  target_databricks_asset_type: databricksAssetTypeEnum,
  status: migrationStatusEnum,
  transformation_config: z.record(z.any()).nullable(), // JSON config for data transformation
  mapping_config: z.record(z.any()).nullable(), // JSON config for field mapping
  error_message: z.string().nullable(),
  progress_percentage: z.number().int().min(0).max(100),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  started_at: z.coerce.date().nullable(),
  completed_at: z.coerce.date().nullable()
});

export type MigrationJob = z.infer<typeof migrationJobSchema>;

// Migration history schema
export const migrationHistorySchema = z.object({
  id: z.number(),
  migration_job_id: z.number(),
  status: migrationStatusEnum,
  message: z.string().nullable(),
  created_at: z.coerce.date()
});

export type MigrationHistory = z.infer<typeof migrationHistorySchema>;

// Input schemas for creating connections
export const createConnectionInputSchema = z.object({
  name: z.string().min(1),
  bi_tool: biToolEnum,
  connection_url: z.string().url(),
  credentials_encrypted: z.string().min(1)
});

export type CreateConnectionInput = z.infer<typeof createConnectionInputSchema>;

// Input schemas for updating connections
export const updateConnectionInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  connection_url: z.string().url().optional(),
  credentials_encrypted: z.string().min(1).optional(),
  status: connectionStatusEnum.optional()
});

export type UpdateConnectionInput = z.infer<typeof updateConnectionInputSchema>;

// Input schemas for creating assets
export const createAssetInputSchema = z.object({
  connection_id: z.number(),
  external_id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable(),
  asset_type: assetTypeEnum,
  metadata: z.record(z.any())
});

export type CreateAssetInput = z.infer<typeof createAssetInputSchema>;

// Input schemas for creating migration jobs
export const createMigrationJobInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable(),
  source_asset_ids: z.array(z.number()).min(1),
  target_databricks_asset_type: databricksAssetTypeEnum,
  transformation_config: z.record(z.any()).nullable(),
  mapping_config: z.record(z.any()).nullable()
});

export type CreateMigrationJobInput = z.infer<typeof createMigrationJobInputSchema>;

// Input schemas for updating migration jobs
export const updateMigrationJobInputSchema = z.object({
  id: z.number(),
  status: migrationStatusEnum.optional(),
  error_message: z.string().nullable().optional(),
  progress_percentage: z.number().int().min(0).max(100).optional(),
  transformation_config: z.record(z.any()).nullable().optional(),
  mapping_config: z.record(z.any()).nullable().optional()
});

export type UpdateMigrationJobInput = z.infer<typeof updateMigrationJobInputSchema>;

// Query schemas
export const getConnectionsQuerySchema = z.object({
  bi_tool: biToolEnum.optional(),
  status: connectionStatusEnum.optional()
});

export type GetConnectionsQuery = z.infer<typeof getConnectionsQuerySchema>;

export const getAssetsQuerySchema = z.object({
  connection_id: z.number().optional(),
  asset_type: assetTypeEnum.optional()
});

export type GetAssetsQuery = z.infer<typeof getAssetsQuerySchema>;

export const getMigrationJobsQuerySchema = z.object({
  status: migrationStatusEnum.optional(),
  target_databricks_asset_type: databricksAssetTypeEnum.optional()
});

export type GetMigrationJobsQuery = z.infer<typeof getMigrationJobsQuerySchema>;