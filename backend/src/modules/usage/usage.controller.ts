import type { RequestHandler } from 'express';
import type { Connection } from 'mongoose';
import { getTenantContext } from '../../middleware/auth.middleware';
import type { UsageService } from './usage.service';
import { upsertUsageLimitSchema, usageLimitsQuerySchema } from './usage.validation';

export function createUsageController(deps: {
  service: UsageService;
  getConnection: (tenantId: string) => Promise<Connection>;
}): { getLimits: RequestHandler; setLimits: RequestHandler } {
  return {
    getLimits: async (req, res, next) => {
      try {
        const { tenantId } = getTenantContext(req);
        const { currency } = usageLimitsQuerySchema.parse(req.query);
        const connection = await deps.getConnection(tenantId);
        const data = await deps.service.getLimits(connection, tenantId, currency);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },

    setLimits: async (req, res, next) => {
      try {
        const { tenantId } = getTenantContext(req);
        const input = upsertUsageLimitSchema.parse(req.body);
        const connection = await deps.getConnection(tenantId);
        const data = await deps.service.upsertLimit(connection, tenantId, input);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  };
}
