import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

vi.mock('../../config.js', () => ({
  config: {
    API_JWT_SECRET: 'test-secret-that-is-at-least-32-chars-long',
  },
}));

import { requireAuth, requireRole } from '../../rest/middleware/auth.js';

const TEST_SECRET = 'test-secret-that-is-at-least-32-chars-long';

function createMockReqResNext() {
  const req = {
    headers: {},
    user: undefined,
  } as unknown as Request;

  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;

  const next = vi.fn() as NextFunction;

  return { req, res, next };
}

describe('auth middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('requireAuth', () => {
    it('should authenticate with a valid JWT', () => {
      const { req, res, next } = createMockReqResNext();

      const payload = {
        nodeId: 'SUN-PHARMA-MFG-001',
        orgRole: 'MANUFACTURER',
        mspId: 'SunPharmaMSP',
      };
      const token = jwt.sign(payload, TEST_SECRET, { expiresIn: '1h' });
      req.headers.authorization = `Bearer ${token}`;

      requireAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user!.nodeId).toBe('SUN-PHARMA-MFG-001');
      expect(req.user!.orgRole).toBe('MANUFACTURER');
      expect(req.user!.mspId).toBe('SunPharmaMSP');
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject when Authorization header is missing', () => {
      const { req, res, next } = createMockReqResNext();

      requireAuth(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Missing or invalid Authorization header',
      });
    });

    it('should reject when Authorization header lacks Bearer prefix', () => {
      const { req, res, next } = createMockReqResNext();
      req.headers.authorization = 'Basic some-token';

      requireAuth(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should reject with an invalid token', () => {
      const { req, res, next } = createMockReqResNext();
      req.headers.authorization = 'Bearer invalid.token.here';

      requireAuth(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid or expired token',
      });
    });

    it('should reject with an expired token', () => {
      const { req, res, next } = createMockReqResNext();

      const payload = {
        nodeId: 'SUN-PHARMA-MFG-001',
        orgRole: 'MANUFACTURER',
        mspId: 'SunPharmaMSP',
      };
      const token = jwt.sign(payload, TEST_SECRET, { expiresIn: '-1s' });
      req.headers.authorization = `Bearer ${token}`;

      requireAuth(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid or expired token',
      });
    });

    it('should reject a token signed with wrong secret', () => {
      const { req, res, next } = createMockReqResNext();

      const payload = {
        nodeId: 'SUN-PHARMA-MFG-001',
        orgRole: 'MANUFACTURER',
        mspId: 'SunPharmaMSP',
      };
      const token = jwt.sign(payload, 'wrong-secret-that-is-long-enough-to-be-valid');
      req.headers.authorization = `Bearer ${token}`;

      requireAuth(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('requireRole', () => {
    it('should allow access when user has the correct role', () => {
      const { req, res, next } = createMockReqResNext();
      req.user = {
        nodeId: 'CDSCO-REG-001',
        orgRole: 'REGULATOR',
        mspId: 'RegMSP',
      };

      const middleware = requireRole('REGULATOR');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow access when user has one of multiple allowed roles', () => {
      const { req, res, next } = createMockReqResNext();
      req.user = {
        nodeId: 'DIST-DELHI-002',
        orgRole: 'DISTRIBUTOR',
        mspId: 'DistMSP',
      };

      const middleware = requireRole('MANUFACTURER', 'DISTRIBUTOR');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny access when user has wrong role', () => {
      const { req, res, next } = createMockReqResNext();
      req.user = {
        nodeId: 'CHEM-MUM-0091',
        orgRole: 'CHEMIST',
        mspId: 'ChemMSP',
      };

      const middleware = requireRole('REGULATOR');
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Requires one of: REGULATOR',
      });
    });

    it('should return 401 when user is not authenticated', () => {
      const { req, res, next } = createMockReqResNext();
      // req.user is undefined

      const middleware = requireRole('REGULATOR');
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Not authenticated',
      });
    });
  });
});
