import { Router } from 'express';
import { getConsoleMenu } from './console.controller';
import { requireAuth } from '../auth/auth.middleware';

const router = Router();

router.get('/menu', requireAuth, getConsoleMenu);

export default router;
