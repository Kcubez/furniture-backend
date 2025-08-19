import { randomBytes } from 'crypto';

export const generateOTP = () => {
  return parseInt(randomBytes(3).toString('hex'), 16) % 1000000; // Generate a 6-digit OTP
};

export const generateToken = () => {
  return randomBytes(32).toString('hex'); // Generate a random token
};
