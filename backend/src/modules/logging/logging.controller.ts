import type { RequestHandler } from 'express';
import { getTenantContext } from '../../middleware/auth.middleware';
import { listAuditEvents } from './logging.service';

export const listLogsHandler: RequestHandler = async (req, res, next) => {
  try {
    const { tenantId } = getTenantContext(req);
    const data = await listAuditEvents(tenantId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
