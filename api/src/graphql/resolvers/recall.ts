import * as fabricClient from '../../fabric/client.js';
import { AuthenticatedUser } from '../../rest/middleware/auth.js';
import { logger } from '../../logger.js';

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
      return { success: true, message: `Recall issued for batch ${args.batchId}` };
    },
  },
};
