import { Request, Response, NextFunction } from 'express';
import { logger } from '../../logger.js';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  logger.error({ err }, 'Unhandled error in request');
  res.status(500).json({
    error: 'Internal server error',
    message: process.env['NODE_ENV'] !== 'production' ? err.message : undefined,
  });
}
