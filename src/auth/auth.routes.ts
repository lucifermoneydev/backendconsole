import { Router } from 'express';
import { signup, login, verifyEmail, checkDB } from './auth.controller';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/verify-email', verifyEmail);
router.post('/checkdb', checkDB);

export default router;