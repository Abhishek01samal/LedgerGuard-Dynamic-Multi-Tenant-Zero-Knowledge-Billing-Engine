import { Router } from 'express';
import { getTenantConnection } from '../../database/tenant.connection';
import { createUsageController } from './usage.controller';
import { UsageService } from './usage.service';

const router = Router();
const controller = createUsageController({
  service: new UsageService(),
  getConnection: getTenantConnection,
});

router.get('/limits', controller.getLimits);
router.put('/limits', controller.setLimits);

export default router;
