import express from 'express';
import { changeLanguage } from '../../../controllers/api/profileController';

const router = express.Router();

// Route to get all users
router.post('/change-language', changeLanguage);

export default router;
