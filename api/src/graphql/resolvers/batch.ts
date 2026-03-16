import * as fabricClient from '../../fabric/client.js';
import { AuthenticatedUser } from '../../rest/middleware/auth.js';

export const batchResolvers = {
  Query: {
    batch: async (_: unknown, args: { batchId: string }) => {
      return fabricClient.getBatch(args.batchId);
    },
    batches: async () => {
      return fabricClient.listBatches();
    },
    recall: async (_: unknown, args: { batchId: string }) => {
      return fabricClient.getRecall(args.batchId);
    },
    anomalies: async () => {
      return [];
    },
  },
  Mutation: {
    mintBatch: async (
      _: unknown,
      args: {
        batchId: string;
        drugName: string;
        composition: string;
        expiryDate: string;
        quantity: number;
        details?: string;
      },
      ctx: { user: AuthenticatedUser }
    ) => {
      await fabricClient.mintBatch({
        batchId: args.batchId,
        manufacturerId: ctx.user.nodeId,
        drugName: args.drugName,
        composition: args.composition,
        expiryDate: args.expiryDate,
        quantity: args.quantity,
        details: args.details ? JSON.parse(args.details) : {},
      });
      return { success: true, message: `Batch ${args.batchId} minted` };
    },

    transferBatch: async (
      _: unknown,
      args: { batchId: string; toNode: string; quantity: number; gpsLocation?: string },
      ctx: { user: AuthenticatedUser }
    ) => {
      await fabricClient.transferBatch({
        batchId: args.batchId,
        fromNode: ctx.user.nodeId,
        toNode: args.toNode,
        quantity: args.quantity,
        gpsLocation: args.gpsLocation ?? '',
      });
      return { success: true, message: 'Transfer recorded' };
    },

    flagChemist: async (
      _: unknown,
      args: { chemistId: string; batchId: string },
      _ctx: { user: AuthenticatedUser }
    ) => {
      await fabricClient.flagChemist({ chemistId: args.chemistId, batchId: args.batchId });
      return { success: true, message: 'Chemist flagged' };
    },
  },
};
