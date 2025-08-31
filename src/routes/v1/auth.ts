import express from 'express';
import {
  register,
  verifyOtp,
  confirmPassword,
  login,
  logout,
  forgetPassword,
  verifyForgetPasswordOtp,
  resetPassword,
} from '../../controllers/authController';

const router = express.Router();

router.post('/register', register);
router.post('/verify-otp', verifyOtp);
router.post('/confirm-password', confirmPassword);
router.post('/login', login);
router.post('/logout', logout);

router.post('/forget-password', forgetPassword);
router.post('/verify', verifyForgetPasswordOtp);
router.post('/reset-password', resetPassword);

// For Mobile
// router.post('/refresh', setRefreshToken);

export default router;
