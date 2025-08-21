import { Request, Response, NextFunction } from 'express';
import { body, check, validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import moment from 'moment';

import { getUserByPhone, createOtp, getOtpByPhone, updateOtp } from '../services/authService';
import { checkOtpErrorIfSameDate, checkUserExists, checkOtpRow } from '../utils/auth';
import { generateOTP, generateToken } from '../utils/generate';
import { count } from 'console';

/**
 * Controller for handling authentication-related requests.
 * This module exports functions to handle user registration, OTP verification,
 * password confirmation, and login.
 */

export const register = [
  body('phone', 'Invalid Phone number')
    .trim()
    .notEmpty()
    .matches('^[0-9]+$')
    .isLength({ min: 5, max: 12 })
    .withMessage('Phone number must be between 5 and 12 digits.'),
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      const error: any = new Error(errors[0]?.msg);
      error.status = 400; // Bad Request
      error.code = 'VALIDATION_ERROR';
      return next(error); // This passes the error to Express
    }
    let phone = req.body.phone;
    if (phone.slice(0, 2) == '09') {
      phone = phone.substring(2, phone.length); // Remove the first two characters if they are '09'
    }
    const exitUser = await getUserByPhone(phone); // Check if user already exists
    checkUserExists(exitUser); // Custom function to check if user exists

    // otp logic would go here, e.g., sending an OTP to the user's phone
    // generate otp and call otp sending api
    // if sms otp cannot be sent, respond with an error
    // save otp to database

    const otp = 123456; // For testing purposes, you can use a static OTP or generate one dynamically
    // const otp = generateOTP(); // For production, generate a random OTP

    // Hash the OTP before saving it to the database
    const salt = await bcrypt.genSalt(10);
    const hashOtp = await bcrypt.hash(otp.toString(), salt);

    const token = generateToken();

    const otpRow = await getOtpByPhone(phone); // Check if OTP already exists for the phone number
    let result;
    if (!otpRow) {
      const optData = {
        phone,
        otp: hashOtp,
        rememberToken: token,
        count: 1,
      };
      result = await createOtp(optData); // Save OTP to database
    } else {
      const lastOtpRequest = new Date(otpRow.updatedAt).toLocaleDateString();
      const today = new Date().toLocaleDateString();
      const isSameDate = lastOtpRequest === today;
      checkOtpErrorIfSameDate(isSameDate, otpRow.error); // Check if OTP request limit is exceeded
      if (!isSameDate) {
        const otpData = {
          otp: hashOtp,
          rememberToken: token,
          count: 1,
          error: 0,
        };
        result = await updateOtp(otpRow.id, otpData); // Update existing OTP
      } else {
        if (otpRow.count === 3) {
          const error: any = new Error('OTP is allowed to be requested only 3 times in a day');
          error.status = 405; // Unauthorized
          error.code = 'OTP_LIMIT_EXCEEDED';
          return next(error); // This passes the error to Express
        } else {
          const otpData = {
            otp: hashOtp,
            rememberToken: token,
            count: { increment: 1 },
          };
          result = await updateOtp(otpRow.id, otpData); // Update existing OTP
        }
      }
    }

    res.status(200).json({
      message: `we are sending otp to 09${result.phone}`,
      phone: result.phone,
      otp: result.otp,
      token: result.rememberToken,
    });
  },
];

export const verifyOtp = [
  body('phone', 'Invalid Phone number')
    .trim()
    .notEmpty()
    .matches('^[0-9]+$')
    .isLength({ min: 5, max: 12 })
    .withMessage('Phone number must be between 5 and 12 digits.'),
  body('otp', 'Invalid OTP').trim().notEmpty().isNumeric().isLength({ min: 6, max: 6 }),
  body('token', 'Invalid Token').trim().notEmpty().escape(),
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      const error: any = new Error(errors[0]?.msg);
      error.status = 400; // Bad Request
      error.code = 'VALIDATION_ERROR';
      return next(error); // This passes the error to Express
    }

    const { phone, otp, token } = req.body;
    const user = await getUserByPhone(phone); // Check if user exists
    checkUserExists(user); // Custom function to check if user exists

    const otpRow = await getOtpByPhone(phone); // Get OTP row by phone number
    checkOtpRow(otpRow); // Check if OTP row exists

    // Check if the OTP matches
    const lastOtpVerify = new Date(otpRow!.updatedAt).toLocaleDateString();
    const today = new Date().toLocaleDateString();
    const isSameDate = lastOtpVerify === today;
    checkOtpErrorIfSameDate(isSameDate, otpRow!.error);

    // Otp is wrong
    if (otpRow?.rememberToken !== token) {
      const otpData = {
        error: 5,
      };
      await updateOtp(otpRow!.id, otpData); // Update OTP row with error count
      const error: any = new Error('Token is invalid');
      error.status = 401; // Unauthorized
      error.code = 'INVALID_TOKEN';
    }

    //Otp is expired
    const isOtpExpired = moment().diff(otpRow?.updatedAt, 'minutes') > 2; // Check if OTP is older than 2 minutes
    if (isOtpExpired) {
      const error: any = new Error('OTP is expired');
      error.status = 403;
      error.code = 'OTP_EXPIRED';
      return next(error); // This passes the error to Express
    }

    const isMatchOtp = await bcrypt.compare(otp, otpRow!.otp); // Compare the provided OTP with the stored hash
    // If OTP does not match
    if (!isMatchOtp) {
      // If OTP error is first time today
      if (isSameDate) {
        const otpData = {
          error: 1,
        };
        await updateOtp(otpRow!.id, otpData); // Update OTP row with error count
      } else {
        //If OTP error is not first time today
        const otpData = {
          error: { increment: 1 },
        };
        await updateOtp(otpRow!.id, otpData);
      }
      const error: any = new Error('OTP is incorrect');
      error.status = 401;
      error.code = 'OTP_INVALID';
      return next(error); // This passes the error to Express
    }

    // If OTP matches,
    const verifyToken = generateToken(); // Generate a new token for the user
    const otpData = {
      verifyToken,
      error: 0,
      count: 1,
    };

    const result = await updateOtp(otpRow!.id, otpData); // Update OTP row with verification token and reset error count

    res.status(200).json({
      message: 'OTP verification successful',
      phone: result.phone,
      token: result.verifyToken,
    });
  },
];

export const confirmPassword = async (req: Request, res: Response, next: NextFunction) => {};

export const login = async (req: Request, res: Response, next: NextFunction) => {};
