import { auth } from '../../middlewares/auth';
import { authorise } from '../../middlewares/authorise';
import authRoutes from './auth';
import adminRoutes from './admin';
import userRoutes from './api';
import express from 'express';
import { maintenance } from '../../middlewares/maintenance';

const router = express.Router();

router.use('/api/v1', authRoutes);
router.use('/api/v1/users', userRoutes);
router.use('/api/v1/admins', auth, authorise(true, 'ADMIN'), adminRoutes);

// router.use('/api/v1', maintenance, authRoutes);
// router.use('/api/v1/users', maintenance, userRoutes);
// router.use('/api/v1/admins', maintenance, auth, authorise(true, 'ADMIN'), adminRoutes);

export default router;
