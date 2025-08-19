import { Request, Response, NextFunction } from 'express';
import { body, check, validationResult } from 'express-validator';
import { getUserByPhone, createOtp } from '../services/authService';
import { checkUserExists } from '../utils/auth';
import { generateOTP, generateToken } from '../utils/generate';

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
    const otp = generateOTP();
    const token = generateToken();
    const optData = {
      phone,
      otp: otp.toString(),
      rememberToken: token,
      count: 1,
    };
    const result = await createOtp(optData); // Save OTP to database

    res.status(200).json({
      message: `we are sending otp to 09${result.phone}`,
      phone: result.phone,
      otp: result.otp,
      token: result.rememberToken,
    });
  },
];

export const verifyOtp = async (req: Request, res: Response, next: NextFunction) => {};

export const confirmPassword = async (req: Request, res: Response, next: NextFunction) => {};

export const login = async (req: Request, res: Response, next: NextFunction) => {};
