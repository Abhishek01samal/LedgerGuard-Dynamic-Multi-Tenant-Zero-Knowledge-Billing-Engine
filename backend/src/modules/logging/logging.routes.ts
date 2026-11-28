import { Router } from 'express';
import { listLogsHandler } from './logging.controller';

const router = Router();
router.get('/events', listLogsHandler);
export default router;
