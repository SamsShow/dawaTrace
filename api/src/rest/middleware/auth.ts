import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config.js';

export type OrgRole = 'MANUFACTURER' | 'DISTRIBUTOR' | 'CHEMIST' | 'REGULATOR' | 'BRIDGE';

export interface AuthenticatedUser {
  nodeId: string;
  orgRole: OrgRole;
  mspId: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * JWT auth middleware. Extracts org role from token claims.
 * Token is issued at login with nodeId, orgRole, mspId.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, config.API_JWT_SECRET) as AuthenticatedUser;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Role-based access control middleware.
 */
export function requireRole(...roles: OrgRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    if (!roles.includes(req.user.orgRole)) {
      res.status(403).json({ error: `Requires one of: ${roles.join(', ')}` });
      return;
    }
    next();
  };
}
