import e, { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import moment from 'moment';
import jwt from 'jsonwebtoken';

import {
  getUserByPhone,
  createOtp,
  getOtpByPhone,
  updateOtp,
  createUser,
  updateUser,
} from '../services/authService';
import {
  checkOtpErrorIfSameDate,
  checkUserExists,
  checkOtpRow,
  chechUserIfNotExists,
} from '../utils/auth';
import { generateOTP, generateToken } from '../utils/generate';
import { error } from 'console';

/**
 * Controller for handling authentication-related requests.
 * This module exports functions to handle user registration, OTP verification,
 * password confirmation, and login.
 */

// Register a new user and send OTP
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

// Verify OTP
export const verifyOtp = [
  body('phone', 'Invalid Phone number')
    .trim()
    .notEmpty()
    .matches('^[0-9]+$')
    .isLength({ min: 5, max: 12 }),
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
      return next(error); // This passes the error to Express
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

// Sending OTP --> Verify OTP --> Confirm Password --> Login
// Confirm password after OTP verification
export const confirmPassword = [
  body('phone', 'Invalid Phone number')
    .trim()
    .notEmpty()
    .matches('^[0-9]+$')
    .isLength({ min: 5, max: 12 }),
  body('password', 'password must be 8 digits.')
    .trim()
    .notEmpty()
    .isNumeric()
    .isLength({ min: 8, max: 8 }),
  body('token', 'Invalid Token').trim().notEmpty().escape(),
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      const error: any = new Error(errors[0]?.msg);
      error.status = 400; // Bad Request
      error.code = 'VALIDATION_ERROR';
      return next(error); // This passes the error to Express
    }

    const { phone, password, token } = req.body;
    const user = await getUserByPhone(phone); // Check if user exists
    checkUserExists(user); // Custom function to check if user exists

    const otpRow = await getOtpByPhone(phone); // Get OTP row by phone number
    checkOtpRow(otpRow); // Check if OTP row exists

    // OTP error count is over 5 limit
    if (otpRow?.error === 5) {
      const error: any = new Error('OTP is wrong for 5 times, please try again tomorrow');
      error.status = 400;
      error.code = 'ERROR_BAD_REQUEST';
      return next(error); // This passes the error to Express
    }

    // token is wrong
    if (otpRow?.verifyToken !== token) {
      const otpData = {
        error: 5,
      };
      await updateOtp(otpRow!.id, otpData); // Update OTP row with error count

      const error: any = new Error('Token is invalid');
      error.status = 400; // Unauthorized
      error.code = 'INVALID_TOKEN';
      return next(error); // This passes the error to Express
    }

    // request is expired
    const isOtpExpired = moment().diff(otpRow?.updatedAt, 'minutes') > 10; // Check if OTP is older than 10 minutes
    if (isOtpExpired) {
      const error: any = new Error('Your Request is expired. Please try again.');
      error.status = 403; // Forbidden
      error.code = 'OTP_EXPIRED';
      return next(error); // This passes the error to Express
    }

    // Hash the password before saving it to the database
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const randToken = 'I will replace refresh token soon';
    const userData = {
      phone,
      password: hashedPassword,
      randToken,
    };

    const newUser = await createUser(userData); // Create new user in the database

    const accessTokenPayload = {
      id: newUser.id,
    };

    const refreshTokenPayload = {
      id: newUser.id,
      phone: newUser.phone,
    };

    const accessToken = jwt.sign(accessTokenPayload, process.env.ACCESS_TOKEN_SECRET!, {
      expiresIn: '15m', // Access token expires in 15 minutes
    });

    const refreshToken = jwt.sign(refreshTokenPayload, process.env.REFRESH_TOKEN_SECRET!, {
      expiresIn: '30d', // Refresh token expires in 7 days
    });

    // Update user with refresh token
    const userUpdateData = {
      randToken: refreshToken,
    };

    await updateUser(newUser.id, userUpdateData); // Update user with refresh token

    res
      .cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict', // Adjust sameSite attribute based on environment
        maxAge: 15 * 60 * 1000, // 15 minutes
      })
      .cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict', // Adjust sameSite attribute based on environment
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      })
      .status(201)
      .json({
        message: 'User registered successfully',
        userId: newUser.id,
      });
  },
];

// Login user with phone and password
export const login = [
  body('phone', 'Invalid Phone number')
    .trim()
    .notEmpty()
    .matches('^[0-9]+$')
    .isLength({ min: 5, max: 12 }),
  body('password', 'password must be 8 digits.')
    .trim()
    .notEmpty()
    .isNumeric()
    .isLength({ min: 8, max: 8 }),
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      const error: any = new Error(errors[0]?.msg);
      error.status = 400; // Bad Request
      error.code = 'VALIDATION_ERROR';
      return next(error); // This passes the error to Express
    }

    // Extract phone and password from the request body
    const password = req.body.password;
    let phone = req.body.phone;
    if (phone.slice(0, 2) == '09') {
      phone = phone.substring(2, phone.length); // Remove the first two characters if they are '09'
    }
    const user = await getUserByPhone(phone); // Check if user exists
    chechUserIfNotExists(user); // Custom function to check if user exists

    // If Password was over limit
    if (user?.status === 'FREEZE') {
      const error: any = new Error('Your account is frozen. Please contact support.');
      error.status = 403; // Forbidden
      error.code = 'ACCOUNT_FROZEN';
      return next(error); // This passes the error to Express
    }

    const isPasswordMatch = await bcrypt.compare(password, user!.password); // Compare the provided password with the stored hash
    // If Password does not match
    if (!isPasswordMatch) {
      // Starting to record wrong password attempts
      const lastRequest = new Date(user!.updatedAt).toLocaleDateString();
      const isSameDate = lastRequest === new Date().toLocaleDateString();

      // If Password error is first time today
      if (isSameDate) {
        const userData = {
          errorLoginCount: 1,
        };
        await updateUser(user!.id, userData); // Update user with error count
      } else {
        // If user has already 3 wrong attempts, freeze the account
        if (user!.errorLoginCount > 2) {
          const userData = {
            status: 'FREEZE',
          };
          await updateUser(user!.id, userData); // Freeze the account after 3 wrong attempts
        } else {
          // Today password was wrong one time
          const userData = {
            errorLoginCount: { increment: 1 },
          };
          await updateUser(user!.id, userData); // Increment error count
        }
      }
      // Ending
      const error: any = new Error('Phone number or password is incorrect');
      error.status = 401; // Unauthorized
      error.code = 'INVALID_CREDENTIALS';
      return next(error); // This passes the error to Express
    }

    // If Password matches,
    const accessTokenPayload = {
      id: user!.id,
    };

    const refreshTokenPayload = {
      id: user!.id,
      phone: user!.phone,
    };

    const accessToken = jwt.sign(accessTokenPayload, process.env.ACCESS_TOKEN_SECRET!, {
      expiresIn: '15m', // Access token expires in 15 minutes
    });

    const refreshToken = jwt.sign(refreshTokenPayload, process.env.REFRESH_TOKEN_SECRET!, {
      expiresIn: '30d', // Refresh token expires in 7 days
    });

    const userData = {
      errorLoginCount: 0, // Reset error count on successful login
      randToken: refreshToken,
    };
    await updateUser(user!.id, userData); // Update user with refresh token and reset error count

    res
      .cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict', // Adjust sameSite attribute based on environment
        maxAge: 15 * 60 * 1000, // 15 minutes
      })
      .cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict', // Adjust sameSite attribute based on environment
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      })
      .status(200)
      .json({
        message: 'Login successful',
        userId: user!.id,
      });
  },
];
