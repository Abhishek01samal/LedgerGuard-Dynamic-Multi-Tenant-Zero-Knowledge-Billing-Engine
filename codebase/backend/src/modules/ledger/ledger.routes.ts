import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import {
  createTransactionHandler,
  getTransactionHandler,
  listTransactionsHandler,
  summaryHandler,
} from './ledger.controller';

const router = Router();

router.post('/transactions', requireAuth, createTransactionHandler);
router.get('/transactions', requireAuth, listTransactionsHandler);
router.get('/transactions/:id', requireAuth, getTransactionHandler);
router.get('/summary', requireAuth, summaryHandler);

export default router;
