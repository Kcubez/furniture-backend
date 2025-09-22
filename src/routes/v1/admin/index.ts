import express from 'express';
import { getAllUsers } from '../../../controllers/admin/userController';
import { setMaintenanceMode } from '../../../controllers/admin/systemController';

const router = express.Router();

// Route to get all users
router.get('/users', getAllUsers);
router.post('/maintenance', setMaintenanceMode);

export default router;
