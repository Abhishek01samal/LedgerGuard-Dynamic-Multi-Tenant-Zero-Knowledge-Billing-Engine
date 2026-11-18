import { Router } from 'express';
import { getTenantContext, requireAuth } from '../../middleware/auth.middleware';
import { AppError } from '../../middleware/error.middleware';
import { getTenantById } from './tenant.service';

const router = Router();

router.get('/current', requireAuth, (req, res, next) => {
  try {
    const { tenantId } = getTenantContext(req);
    const tenant = getTenantById(tenantId);
    if (!tenant) {
      throw new AppError(404, `Tenant not found: ${tenantId}`, 'TENANT_NOT_FOUND');
    }
    res.status(200).json({
      success: true,
      data: {
        tenantId: tenant.tenantId,
        databaseStatus: tenant.status === 'active' ? 'connected' : 'disconnected',
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;

