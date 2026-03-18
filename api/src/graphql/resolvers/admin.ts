import * as fabricClient from '../../fabric/client.js';
import { AuthenticatedUser } from '../../rest/middleware/auth.js';
import { logger } from '../../logger.js';

export const adminResolvers = {
  Query: {
    chemistViolations: async () => {
      return fabricClient.listChemistViolations();
    },
    chemistViolation: async (_: unknown, args: { chemistId: string }) => {
      return fabricClient.getChemistViolation(args.chemistId);
    },
  },
  Mutation: {
    liftSuspension: async (
      _: unknown,
      args: { chemistId: string },
      ctx: { user: AuthenticatedUser }
    ) => {
      if (!ctx.user || ctx.user.orgRole !== 'REGULATOR') {
        return { success: false, message: 'Only REGULATOR role can lift suspensions' };
      }
      logger.info({ chemistId: args.chemistId, regulatorId: ctx.user.nodeId }, 'Lift suspension initiated via GraphQL');
      await fabricClient.liftSuspension({
        chemistId: args.chemistId,
        regulatorId: ctx.user.nodeId,
      });
      return { success: true, message: `Suspension lifted for chemist ${args.chemistId}` };
    },

    bulkRecall: async (
      _: unknown,
      args: { batchIds: string[]; reason: string },
      ctx: { user: AuthenticatedUser }
    ) => {
      if (!ctx.user || ctx.user.orgRole !== 'REGULATOR') {
        return { success: false, message: 'Only REGULATOR role can issue bulk recalls' };
      }
      logger.warn({ batchIds: args.batchIds, regulatorId: ctx.user.nodeId }, 'Bulk recall initiated via GraphQL');

      const errors: string[] = [];
      for (const batchId of args.batchIds) {
        try {
          await fabricClient.issueRecall({
            batchId,
            regulatorId: ctx.user.nodeId,
            reason: args.reason,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`${batchId}: ${msg}`);
          logger.error({ batchId, err }, 'Bulk recall failed for batch');
        }
      }

      if (errors.length > 0) {
        return {
          success: false,
          message: `Recalled ${args.batchIds.length - errors.length}/${args.batchIds.length} batches. Errors: ${errors.join('; ')}`,
        };
      }
      return { success: true, message: `Recalled ${args.batchIds.length} batches successfully` };
    },
  },
};
