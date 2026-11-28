import type { RequestHandler } from 'express';
import type { Connection } from 'mongoose';
import { getTenantContext } from '../../middleware/auth.middleware';
import { getTransactionReceipt } from './security.service';
import { receiptParamSchema } from './security.validation';

export function createSecurityController(getConnection: (tenantId: string) => Promise<Connection>): {
  getReceipt: RequestHandler;
} {
  return {
    getReceipt: async (req, res, next) => {
      try {
        const { tenantId, userId } = getTenantContext(req);
        const { transactionId } = receiptParamSchema.parse(req.params);
        const data = await getTransactionReceipt(
          { tenantId, userId, connection: await getConnection(tenantId) },
          transactionId,
        );
        res.json({ success: true, data, valid: true });
      } catch (err) {
        next(err);
      }
    },
  };
}
