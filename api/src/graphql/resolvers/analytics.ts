import * as fabricClient from '../../fabric/client.js';
import { logger } from '../../logger.js';

interface StatusCount {
  status: string;
  count: number;
}

interface ActivityPoint {
  date: string;
  batches: number;
  recalls: number;
}

interface AnalyticsData {
  totalBatches: number;
  activeBatches: number;
  recalledBatches: number;
  inTransitBatches: number;
  dispensedBatches: number;
  totalRecalls: number;
  statusDistribution: StatusCount[];
  recentActivity: ActivityPoint[];
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const analyticsResolvers = {
  Query: {
    analytics: async (): Promise<AnalyticsData> => {
      const [batches, recalls] = await Promise.all([
        fabricClient.listBatches(),
        fabricClient.listRecalls(),
      ]);

      logger.debug({ batchCount: batches.length, recallCount: recalls.length }, 'Computing analytics');

      // Count by status
      const statusCounts: Record<string, number> = {};
      let activeBatches = 0;
      let inTransitBatches = 0;
      let dispensedBatches = 0;
      let recalledBatches = 0;

      for (const batch of batches) {
        statusCounts[batch.status] = (statusCounts[batch.status] || 0) + 1;
        switch (batch.status) {
          case 'ACTIVE':
            activeBatches++;
            break;
          case 'IN_TRANSIT':
            inTransitBatches++;
            break;
          case 'DISPENSED':
            dispensedBatches++;
            break;
          case 'RECALLED':
            recalledBatches++;
            break;
        }
      }

      const statusDistribution: StatusCount[] = Object.entries(statusCounts).map(
        ([status, count]) => ({ status, count })
      );

      // Generate recent activity points (last 30 days, grouped by day)
      const now = Date.now();
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

      // Build a map of date -> counts
      const activityMap: Record<string, { batches: number; recalls: number }> = {};

      // Initialize all 30 days
      for (let i = 29; i >= 0; i--) {
        const date = formatDate(now - i * 24 * 60 * 60 * 1000);
        activityMap[date] = { batches: 0, recalls: 0 };
      }

      // Count batches created per day
      for (const batch of batches) {
        if (batch.createdAt >= thirtyDaysAgo) {
          const date = formatDate(batch.createdAt);
          if (activityMap[date]) {
            activityMap[date].batches++;
          }
        }
      }

      // Count recalls per day
      for (const recall of recalls) {
        if (recall.timestamp >= thirtyDaysAgo) {
          const date = formatDate(recall.timestamp);
          if (activityMap[date]) {
            activityMap[date].recalls++;
          }
        }
      }

      const recentActivity: ActivityPoint[] = Object.entries(activityMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, counts]) => ({
          date,
          batches: counts.batches,
          recalls: counts.recalls,
        }));

      return {
        totalBatches: batches.length,
        activeBatches,
        recalledBatches,
        inTransitBatches,
        dispensedBatches,
        totalRecalls: recalls.length,
        statusDistribution,
        recentActivity,
      };
    },
  },
};
