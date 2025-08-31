import { auth } from '../../middlewares/auth';
import { authorise } from '../../middlewares/authorise';
import authRoutes from './auth';
import adminRoutes from './admin';
import userRoutes from './api';

import express from 'express';
import { check } from '../../middlewares/check';
import { healthCheck } from '../../controllers/healthController';

const router = express.Router();

// Health check endpoint
// router.get('/health', check, healthCheck);

router.use('/api/v1', authRoutes);
router.use('/api/v1/users', userRoutes);
router.use('/api/v1/admins', auth, authorise(true, 'ADMIN'), adminRoutes);

export default router;
