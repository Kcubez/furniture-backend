import express from 'express';
import { auth } from '../../../middlewares/auth';
import { changeLanguage, testPermission } from '../../../controllers/api/profileController';

const router = express.Router();

// Route to get all users
router.post('/change-language', changeLanguage);
router.get('/test-permission', auth, testPermission);

export default router;
