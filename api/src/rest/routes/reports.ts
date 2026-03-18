import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { reportsStore, type Report, type ReportStatus } from '../../graphql/resolvers/report.js';
import { logger } from '../../logger.js';

const router = Router();

const SubmitReportSchema = z.object({
  batchId: z.string().min(1),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
  reporterAddress: z.string().optional(),
});

const ResolveReportSchema = z.object({
  status: z.enum(['CONFIRMED', 'REJECTED']),
});

let reportCounter = 0;

function generateReportId(): string {
  reportCounter += 1;
  return `RPT-${Date.now()}-${String(reportCounter).padStart(4, '0')}`;
}

/** POST /api/reports — submit a whistleblower report (public, no auth required) */
router.post('/', async (req, res, next) => {
  try {
    const body = SubmitReportSchema.parse(req.body);

    const report: Report = {
      id: generateReportId(),
      batchId: body.batchId,
      reporterAddress: body.reporterAddress ?? 'anonymous',
      reason: body.reason,
      status: 'PENDING',
      createdAt: Date.now(),
      resolvedAt: null,
      pointsAwarded: null,
    };

    reportsStore.push(report);
    logger.info({ reportId: report.id, batchId: report.batchId }, 'Whistleblower report submitted via REST');

    res.status(201).json({
      message: `Report ${report.id} submitted successfully`,
      reportId: report.id,
    });
  } catch (err) {
    next(err);
  }
});

/** GET /api/reports — list all reports (regulator only) */
router.get('/', requireAuth, requireRole('REGULATOR'), async (_req, res) => {
  res.json(reportsStore);
});

/** GET /api/reports/:id — get a single report */
router.get('/:id', requireAuth, async (req, res) => {
  const report = reportsStore.find((r) => r.id === req.params['id']);
  if (!report) {
    res.status(404).json({ error: 'Report not found' });
    return;
  }
  res.json(report);
});

/** PATCH /api/reports/:id/resolve — resolve a report (regulator only) */
router.patch('/:id/resolve', requireAuth, requireRole('REGULATOR'), async (req, res, next) => {
  try {
    const { status } = ResolveReportSchema.parse(req.body);
    const report = reportsStore.find((r) => r.id === req.params['id']);

    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    if (report.status !== 'PENDING') {
      res.status(400).json({ error: `Report is already ${report.status}` });
      return;
    }

    report.status = status as ReportStatus;
    report.resolvedAt = Date.now();

    if (status === 'CONFIRMED') {
      const points = 100;
      report.pointsAwarded = points;
      logger.info(
        { reportId: report.id, reporter: report.reporterAddress, points },
        'Report confirmed — DawaPoints awarded via bridge'
      );
    } else {
      logger.info({ reportId: report.id }, 'Report rejected');
    }

    res.json({
      message: status === 'CONFIRMED'
        ? `Report ${report.id} confirmed — ${report.pointsAwarded} DawaPoints awarded`
        : `Report ${report.id} rejected`,
      report,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
