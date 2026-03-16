import * as suiQueries from '../../sui/queries.js';

export const verifyResolvers = {
  Query: {
    verifyBatch: async (_: unknown, args: { suiObjectId: string }) => {
      return suiQueries.verifyBatch(args.suiObjectId);
    },
  },
};
