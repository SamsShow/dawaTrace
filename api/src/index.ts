import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { useServer } from 'graphql-ws/lib/use/ws';
import { WebSocketServer } from 'ws';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { logger } from './logger.js';
import { typeDefs } from './graphql/schema.js';
import { batchResolvers } from './graphql/resolvers/batch.js';
import { recallResolvers } from './graphql/resolvers/recall.js';
import { verifyResolvers } from './graphql/resolvers/verify.js';
import { adminResolvers } from './graphql/resolvers/admin.js';
import { analyticsResolvers } from './graphql/resolvers/analytics.js';
import { reportResolvers } from './graphql/resolvers/report.js';
import { errorHandler } from './rest/middleware/errorHandler.js';
import healthRouter from './rest/routes/health.js';
import batchesRouter from './rest/routes/batches.js';
import recallsRouter from './rest/routes/recalls.js';
import verifyRouter from './rest/routes/verify.js';
import exportsRouter from './rest/routes/exports.js';
import reportsRouter from './rest/routes/reports.js';
import { registry, httpRequestDuration, httpRequestTotal } from './metrics.js';

async function main() {
  const app = express();

  // CORS
  const corsOrigins = config.API_CORS_ORIGINS.split(',').map((o) => o.trim());
  app.use(cors({ origin: corsOrigins, credentials: true }));
  app.use(express.json());

  // Prometheus metrics endpoint (before rate limiter — should always be accessible)
  app.get('/metrics', async (_req, res) => {
    try {
      res.set('Content-Type', registry.contentType);
      res.end(await registry.metrics());
    } catch (err) {
      res.status(500).end(String(err));
    }
  });

  // Request tracking middleware
  app.use((req, res, next) => {
    const end = httpRequestDuration.startTimer();
    res.on('finish', () => {
      const route = req.route?.path || req.path;
      const labels = {
        method: req.method,
        route,
        status: String(res.statusCode),
      };
      end(labels);
      httpRequestTotal.inc(labels);
    });
    next();
  });

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 60_000,
    max: 300,
    message: { error: 'Too many requests' },
  });
  app.use(limiter);

  // REST routes
  app.use('/health', healthRouter);
  app.use('/api/batches', batchesRouter);
  app.use('/api/recalls', recallsRouter);
  app.use('/verify', verifyRouter); // Public — no auth
  app.use('/api/exports', exportsRouter);
  app.use('/api/reports', reportsRouter);

  // GraphQL (Apollo Server v4)
  const schema = makeExecutableSchema({
    typeDefs,
    resolvers: [batchResolvers, recallResolvers, verifyResolvers, adminResolvers, analyticsResolvers, reportResolvers],
  });

  // Create HTTP server from Express app for WebSocket support
  const httpServer = createServer(app);

  // WebSocket server for GraphQL subscriptions
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });
  const serverCleanup = useServer({ schema }, wsServer);

  const apolloServer = new ApolloServer({
    schema,
    plugins: [
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ],
  });
  await apolloServer.start();

  app.use(
    '/graphql',
    expressMiddleware(apolloServer, {
      context: async ({ req }) => {
        // Extract user from JWT if present (GraphQL mutations require auth)
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
          try {
            const jwt = await import('jsonwebtoken');
            const token = authHeader.slice(7);
            const user = jwt.default.verify(token, config.API_JWT_SECRET);
            return { user };
          } catch {
            return {};
          }
        }
        return {};
      },
    })
  );

  // Error handler must be last
  app.use(errorHandler);

  httpServer.listen(config.API_PORT, () => {
    logger.info({ port: config.API_PORT }, `DawaTrace API server started`);
    logger.info(`  REST: http://localhost:${config.API_PORT}/api`);
    logger.info(`  GraphQL: http://localhost:${config.API_PORT}/graphql`);
    logger.info(`  GraphQL WS: ws://localhost:${config.API_PORT}/graphql`);
    logger.info(`  Health: http://localhost:${config.API_PORT}/health`);
    logger.info(`  Metrics: http://localhost:${config.API_PORT}/metrics`);
  });
}

main().catch((err) => {
  logger.error({ err }, 'Fatal error starting API server');
  process.exit(1);
});
