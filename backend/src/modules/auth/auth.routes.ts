import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { loginHandler, logoutHandler, meHandler } from './auth.controller';

const router = Router();

router.post('/login', loginHandler);
router.post('/logout', logoutHandler);
router.get('/me', requireAuth, meHandler);

export default router;
