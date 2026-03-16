import express from 'express';
import cors from 'cors';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { makeExecutableSchema } from '@graphql-tools/schema';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { logger } from './logger.js';
import { typeDefs } from './graphql/schema.js';
import { batchResolvers } from './graphql/resolvers/batch.js';
import { recallResolvers } from './graphql/resolvers/recall.js';
import { verifyResolvers } from './graphql/resolvers/verify.js';
import { errorHandler } from './rest/middleware/errorHandler.js';
import healthRouter from './rest/routes/health.js';
import batchesRouter from './rest/routes/batches.js';
import recallsRouter from './rest/routes/recalls.js';
import verifyRouter from './rest/routes/verify.js';

async function main() {
  const app = express();

  // CORS
  const corsOrigins = config.API_CORS_ORIGINS.split(',').map((o) => o.trim());
  app.use(cors({ origin: corsOrigins, credentials: true }));
  app.use(express.json());

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

  // GraphQL (Apollo Server v4)
  const schema = makeExecutableSchema({
    typeDefs,
    resolvers: [batchResolvers, recallResolvers, verifyResolvers],
  });

  const apolloServer = new ApolloServer({ schema });
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

  app.listen(config.API_PORT, () => {
    logger.info({ port: config.API_PORT }, `DawaTrace API server started`);
    logger.info(`  REST: http://localhost:${config.API_PORT}/api`);
    logger.info(`  GraphQL: http://localhost:${config.API_PORT}/graphql`);
    logger.info(`  Health: http://localhost:${config.API_PORT}/health`);
  });
}

main().catch((err) => {
  logger.error({ err }, 'Fatal error starting API server');
  process.exit(1);
});
