import { Router } from 'express';
import { getTenantConnection } from '../../database/tenant.connection';
import { createSecurityController } from './security.controller';

const router = Router();
const controller = createSecurityController(getTenantConnection);

router.get('/receipt/:transactionId', controller.getReceipt);

export default router;
