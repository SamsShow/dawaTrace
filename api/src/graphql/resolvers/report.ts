import { logger } from '../../logger.js';

export type ReportStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED';

export interface Report {
  id: string;
  batchId: string;
  reporterAddress: string;
  reason: string;
  status: ReportStatus;
  createdAt: number;
  resolvedAt: number | null;
  pointsAwarded: number | null;
}

/** In-memory store for MVP — replace with Fabric/DB in production */
export const reportsStore: Report[] = [];

let reportCounter = 0;

function generateReportId(): string {
  reportCounter += 1;
  return `RPT-${Date.now()}-${String(reportCounter).padStart(4, '0')}`;
}

export const reportResolvers = {
  Query: {
    reports: () => {
      return reportsStore;
    },
    report: (_: unknown, args: { id: string }) => {
      return reportsStore.find((r) => r.id === args.id) ?? null;
    },
  },
  Mutation: {
    submitReport: (
      _: unknown,
      args: { batchId: string; reason: string; reporterAddress?: string }
    ) => {
      const report: Report = {
        id: generateReportId(),
        batchId: args.batchId,
        reporterAddress: args.reporterAddress ?? 'anonymous',
        reason: args.reason,
        status: 'PENDING',
        createdAt: Date.now(),
        resolvedAt: null,
        pointsAwarded: null,
      };

      reportsStore.push(report);
      logger.info({ reportId: report.id, batchId: report.batchId }, 'Whistleblower report submitted');

      return { success: true, message: `Report ${report.id} submitted successfully` };
    },

    resolveReport: (
      _: unknown,
      args: { id: string; status: ReportStatus }
    ) => {
      const report = reportsStore.find((r) => r.id === args.id);
      if (!report) {
        return { success: false, message: `Report ${args.id} not found` };
      }

      if (report.status !== 'PENDING') {
        return { success: false, message: `Report ${args.id} is already ${report.status}` };
      }

      report.status = args.status;
      report.resolvedAt = Date.now();

      if (args.status === 'CONFIRMED') {
        // Award DawaPoints — in production, bridge would call buildAwardPointsTx
        const points = 100;
        report.pointsAwarded = points;
        logger.info(
          { reportId: report.id, reporter: report.reporterAddress, points },
          'Report confirmed — DawaPoints awarded via bridge'
        );
      } else {
        logger.info({ reportId: report.id }, 'Report rejected');
      }

      return {
        success: true,
        message: args.status === 'CONFIRMED'
          ? `Report ${args.id} confirmed — ${report.pointsAwarded} DawaPoints awarded`
          : `Report ${args.id} rejected`,
      };
    },
  },
};
