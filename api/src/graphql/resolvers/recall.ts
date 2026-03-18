import * as fabricClient from '../../fabric/client.js';
import { AuthenticatedUser } from '../../rest/middleware/auth.js';
import { logger } from '../../logger.js';
import { pubsub, EVENTS } from '../pubsub.js';

export const recallResolvers = {
  Query: {
    recalls: async () => {
      return fabricClient.listRecalls();
    },
  },
  Mutation: {
    issueRecall: async (
      _: unknown,
      args: { batchId: string; reason: string },
      ctx: { user: AuthenticatedUser }
    ) => {
      logger.warn({ batchId: args.batchId, regulatorId: ctx.user.nodeId }, 'Recall initiated via GraphQL');
      await fabricClient.issueRecall({
        batchId: args.batchId,
        regulatorId: ctx.user.nodeId,
        reason: args.reason,
      });
      pubsub.publish(EVENTS.RECALL_ISSUED, {
        recallIssued: {
          batchId: args.batchId,
          regulatorId: ctx.user.nodeId,
          reason: args.reason,
          timestamp: Date.now(),
          suiTxDigest: '',
        },
      });
      return { success: true, message: `Recall issued for batch ${args.batchId}` };
    },
  },
  Subscription: {
    recallIssued: {
      subscribe: () => pubsub.asyncIterableIterator([EVENTS.RECALL_ISSUED]),
    },
  },
};
