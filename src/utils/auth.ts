import { errorCode } from '../../config/errorCode';

export const checkUserExists = (exitUser: any) => {
  if (exitUser) {
    const error: any = new Error('User already exists with this phone number');
    error.status = 400; // Bad Request
    error.code = errorCode.userExit;
    throw error; // This will be caught by the error handling middleware
  }
};

export const checkOtpErrorIfSameDate = (isSameDate: boolean, errorCount: number) => {
  if (isSameDate && errorCount === 5) {
    const error: any = new Error('OTP is wrong for 5 times, please try again tomorrow');
    error.status = 401;
    error.code = errorCode.overLimit;
    throw error; // This will be caught by the error handling middleware
  }
};

export const checkOtpRow = (otpRow: any) => {
  if (!otpRow) {
    const error: any = new Error('phone number is incorrect');
    error.status = 400; // Not Found
    error.code = errorCode.invalid;
    throw error; // This will be caught by the error handling middleware
  }
};

export const checkUserIfNotExists = (user: any) => {
  if (!user) {
    const error: any = new Error('User not found with this phone number');
    error.status = 401; // Unauthorized
    error.code = errorCode.unauthenticated;
    throw error; // This will be caught by the error handling middleware
  }
};
