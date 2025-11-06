import express from 'express';
import { auth } from '../../../middlewares/auth';
import {
  changeLanguage,
  testPermission,
  uploadProfile,
} from '../../../controllers/api/profileController';
import upload from '../../../middlewares/uploadFile';

const router = express.Router();

// Route to get all users
router.post('/change-language', changeLanguage);
router.get('/test-permission', auth, testPermission);

router.patch('/profile/upload', auth, upload.single('avatar'), uploadProfile);

export default router;
