import express from 'express';
import { getAllUsers } from '../../../controllers/admin/userController';

const router = express.Router();

// Route to get all users
router.get('/users', getAllUsers);

export default router;
