import * as store from '../store';
import * as suiQueries from '../sui/queries';
import { detectAnomalies } from '../anomaly/detector';
import { logger } from '../logger';

type ReportStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED';

interface Report {
  id: string;
  batchId: string;
  reporterAddress: string;
  reason: string;
  status: ReportStatus;
  createdAt: number;
  resolvedAt: number | null;
  pointsAwarded: number | null;
}

// Seed reports for the demo dashboard. In production, reports would be
// stored in a database or on-chain.
const SEED_REPORTS: Report[] = [
  {
    id: 'RPT-1743500000000-0001',
    batchId: 'BATCH-2026-003',
    reporterAddress: '0x7a9f...',
    reason: 'Packaging seal appears tampered — batch label inconsistent with manufacturer specs',
    status: 'CONFIRMED',
    createdAt: 1743400000000,
    resolvedAt: 1743450000000,
    pointsAwarded: 100,
  },
];

interface GqlContext {
  user?: { nodeId: string; orgRole: string };
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const resolvers = {
  Query: {
    batch: async (_: unknown, args: { batchId: string }) => store.getBatch(args.batchId),
    batches: async () => store.listBatches(),
    recall: async (_: unknown, args: { batchId: string }) => store.getRecall(args.batchId),
    recalls: async () => store.listRecalls(),
    verifyBatch: async (_: unknown, args: { suiObjectId: string }) => suiQueries.verifyBatch(args.suiObjectId),
    anomalies: async (_: unknown, args: { limit?: number }) => {
      const batches = await store.listBatches();
      return detectAnomalies(batches, args.limit);
    },
    chemistViolations: async () => store.listChemistViolations(),
    chemistViolation: async (_: unknown, args: { chemistId: string }) => store.getChemistViolation(args.chemistId),
    analytics: async () => {
      const [batches, recalls] = await Promise.all([store.listBatches(), store.listRecalls()]);

      const statusCounts: Record<string, number> = {};
      let activeBatches = 0, inTransitBatches = 0, dispensedBatches = 0, recalledBatches = 0;

      for (const batch of batches) {
        statusCounts[batch.status] = (statusCounts[batch.status] || 0) + 1;
        if (batch.status === 'ACTIVE') activeBatches++;
        else if (batch.status === 'IN_TRANSIT') inTransitBatches++;
        else if (batch.status === 'DISPENSED') dispensedBatches++;
        else if (batch.status === 'RECALLED') recalledBatches++;
      }

      const statusDistribution = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));

      const now = Date.now();
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
      const activityMap: Record<string, { batches: number; recalls: number }> = {};
      for (let i = 29; i >= 0; i--) {
        activityMap[formatDate(now - i * 24 * 60 * 60 * 1000)] = { batches: 0, recalls: 0 };
      }
      for (const batch of batches) {
        if (batch.createdAt >= thirtyDaysAgo) {
          const date = formatDate(batch.createdAt);
          if (activityMap[date]) activityMap[date].batches++;
        }
      }
      for (const recall of recalls) {
        if (recall.timestamp >= thirtyDaysAgo) {
          const date = formatDate(recall.timestamp);
          if (activityMap[date]) activityMap[date].recalls++;
        }
      }

      const recentActivity = Object.entries(activityMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, counts]) => ({ date, ...counts }));

      return {
        totalBatches: batches.length, activeBatches, recalledBatches, inTransitBatches,
        dispensedBatches, totalRecalls: recalls.length, statusDistribution, recentActivity,
      };
    },
    reports: () => SEED_REPORTS,
    report: (_: unknown, args: { id: string }) => SEED_REPORTS.find((r) => r.id === args.id) ?? null,
  },
  Mutation: {
    mintBatch: async (_: unknown, args: { batchId: string; drugName: string; composition: string; expiryDate: string; quantity: number; details?: string }, ctx: GqlContext) => {
      if (!ctx.user) return { success: false, message: 'Authentication required' };
      await store.mintBatch({
        batchId: args.batchId, manufacturerId: ctx.user.nodeId,
        drugName: args.drugName, composition: args.composition, expiryDate: args.expiryDate,
        quantity: args.quantity, details: args.details ? JSON.parse(args.details) : {},
      });
      return { success: true, message: `Batch ${args.batchId} minted` };
    },
    transferBatch: async (_: unknown, args: { batchId: string; toNode: string; quantity: number; gpsLocation?: string }, ctx: GqlContext) => {
      if (!ctx.user) return { success: false, message: 'Authentication required' };
      await store.transferBatch({
        batchId: args.batchId, fromNode: ctx.user.nodeId,
        toNode: args.toNode, quantity: args.quantity, gpsLocation: args.gpsLocation ?? '',
      });
      return { success: true, message: 'Transfer recorded' };
    },
    issueRecall: async (_: unknown, args: { batchId: string; reason: string }, ctx: GqlContext) => {
      if (!ctx.user) return { success: false, message: 'Authentication required' };
      logger.warn({ batchId: args.batchId }, 'Recall initiated via GraphQL');
      await store.issueRecall({ batchId: args.batchId, regulatorId: ctx.user.nodeId, reason: args.reason });
      return { success: true, message: `Recall issued for batch ${args.batchId}` };
    },
    flagChemist: async (_: unknown, args: { chemistId: string; batchId: string }, ctx: GqlContext) => {
      if (!ctx.user) return { success: false, message: 'Authentication required' };
      await store.flagChemist(args);
      return { success: true, message: 'Chemist flagged' };
    },
    liftSuspension: async (_: unknown, args: { chemistId: string }, ctx: GqlContext) => {
      if (!ctx.user) return { success: false, message: 'Authentication required' };
      if (ctx.user.orgRole !== 'REGULATOR') return { success: false, message: 'Only REGULATOR role can lift suspensions' };
      await store.liftSuspension({ chemistId: args.chemistId, regulatorId: ctx.user.nodeId });
      return { success: true, message: `Suspension lifted for chemist ${args.chemistId}` };
    },
    bulkRecall: async (_: unknown, args: { batchIds: string[]; reason: string }, ctx: GqlContext) => {
      if (!ctx.user) return { success: false, message: 'Authentication required' };
      if (ctx.user.orgRole !== 'REGULATOR') return { success: false, message: 'Only REGULATOR role can issue bulk recalls' };
      const errors: string[] = [];
      for (const batchId of args.batchIds) {
        try {
          await store.issueRecall({ batchId, regulatorId: ctx.user.nodeId, reason: args.reason });
        } catch (err) {
          errors.push(`${batchId}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      if (errors.length > 0) {
        return { success: false, message: `Recalled ${args.batchIds.length - errors.length}/${args.batchIds.length} batches. Errors: ${errors.join('; ')}` };
      }
      return { success: true, message: `Recalled ${args.batchIds.length} batches successfully` };
    },
    submitReport: (_: unknown, args: { batchId: string; reason: string; reporterAddress?: string }) => {
      // TODO: Persist to database or on-chain
      logger.info({ batchId: args.batchId }, 'Report submitted');
      return { success: true, message: 'Report submitted successfully' };
    },
    resolveReport: (_: unknown, args: { id: string; status: ReportStatus }) => {
      // TODO: Persist to database or on-chain
      logger.info({ reportId: args.id, status: args.status }, 'Report resolved');
      return { success: true, message: `Report ${args.id} ${args.status.toLowerCase()}` };
    },
  },
};
