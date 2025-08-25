import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createConnectionInputSchema,
  updateConnectionInputSchema,
  getConnectionsQuerySchema,
  getAssetsQuerySchema,
  createMigrationJobInputSchema,
  updateMigrationJobInputSchema,
  getMigrationJobsQuerySchema
} from './schema';

// Import handlers
import { createConnection } from './handlers/create_connection';
import { getConnections } from './handlers/get_connections';
import { updateConnection } from './handlers/update_connection';
import { syncAssets } from './handlers/sync_assets';
import { getAssets } from './handlers/get_assets';
import { createMigrationJob } from './handlers/create_migration_job';
import { getMigrationJobs } from './handlers/get_migration_jobs';
import { updateMigrationJob } from './handlers/update_migration_job';
import { getMigrationHistory } from './handlers/get_migration_history';
import { testConnection } from './handlers/test_connection';
import { cancelMigrationJob } from './handlers/cancel_migration_job';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Connection management
  createConnection: publicProcedure
    .input(createConnectionInputSchema)
    .mutation(({ input }) => createConnection(input)),

  getConnections: publicProcedure
    .input(getConnectionsQuerySchema.optional())
    .query(({ input }) => getConnections(input)),

  updateConnection: publicProcedure
    .input(updateConnectionInputSchema)
    .mutation(({ input }) => updateConnection(input)),

  testConnection: publicProcedure
    .input(z.object({ connectionId: z.number() }))
    .mutation(({ input }) => testConnection(input.connectionId)),

  // Asset management
  syncAssets: publicProcedure
    .input(z.object({ connectionId: z.number() }))
    .mutation(({ input }) => syncAssets(input.connectionId)),

  getAssets: publicProcedure
    .input(getAssetsQuerySchema.optional())
    .query(({ input }) => getAssets(input)),

  // Migration job management
  createMigrationJob: publicProcedure
    .input(createMigrationJobInputSchema)
    .mutation(({ input }) => createMigrationJob(input)),

  getMigrationJobs: publicProcedure
    .input(getMigrationJobsQuerySchema.optional())
    .query(({ input }) => getMigrationJobs(input)),

  updateMigrationJob: publicProcedure
    .input(updateMigrationJobInputSchema)
    .mutation(({ input }) => updateMigrationJob(input)),

  cancelMigrationJob: publicProcedure
    .input(z.object({ jobId: z.number() }))
    .mutation(({ input }) => cancelMigrationJob(input.jobId)),

  // Migration history
  getMigrationHistory: publicProcedure
    .input(z.object({ migrationJobId: z.number() }))
    .query(({ input }) => getMigrationHistory(input.migrationJobId)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();