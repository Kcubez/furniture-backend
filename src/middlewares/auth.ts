import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { errorCode } from '../../config/errorCode';
import { getUserById, updateUser } from '../services/authService';
import { createError } from '../utils/error';

interface CustomRequest extends Request {
  userId?: number;
}

export const auth = (req: CustomRequest, res: Response, next: NextFunction) => {
  // Check if the request is from a mobile platform
  // If so, extract the access token from the Authorization header
  // const platform = req.headers['x-platform'];
  // if (platform === 'mobile') {
  //   const accessTokenMobile = req.headers.authorization?.split(' ')[1];
  //   console.log('Request from Mobile:', accessTokenMobile);
  // } else {
  //   console.log('Request from Mobile:');
  // }

  // For web platform, check cookies for access and refresh tokens
  const accessToken = req.cookies ? req.cookies.accessToken : null;
  const refreshToken = req.cookies ? req.cookies.refreshToken : null;
  if (!refreshToken) {
    return next(createError('You are not authenticated.', 401, errorCode.unauthenticated));
  }

  const generateNewTokens = async () => {
    let decodedRefreshToken;
    try {
      decodedRefreshToken = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET!) as {
        id: number;
        phone: string;
      };
    } catch (error) {
      return next(createError('You are not authenticated.', 401, errorCode.unauthenticated));
    }

    if (isNaN(decodedRefreshToken.id)) {
      return next(createError('You are not authenticated.', 401, errorCode.unauthenticated));
    }

    const user = await getUserById(decodedRefreshToken.id);
    if (!user) {
      return next(createError('This account has not registered.', 401, errorCode.unauthenticated));
    }

    if (user.phone !== decodedRefreshToken.phone) {
      return next(createError('You are not authenticated', 401, errorCode.unauthenticated));
    }

    if (user.randToken !== refreshToken) {
      return next(createError('You are not authenticated', 401, errorCode.unauthenticated));
    }
    const accessTokenPayload = {
      id: user.id,
    };

    const refreshTokenPayload = {
      id: user.id,
      phone: user.phone,
    };

    const newAccessToken = jwt.sign(accessTokenPayload, process.env.ACCESS_TOKEN_SECRET!, {
      expiresIn: 60 * 15, // Access token expires in 15 minutes
    });

    const newRefreshToken = jwt.sign(refreshTokenPayload, process.env.REFRESH_TOKEN_SECRET!, {
      expiresIn: '30d', // Refresh token expires in 7 days
    });

    const userData = {
      randToken: newRefreshToken,
    };
    await updateUser(user.id, userData); // Update user with refresh token and reset error count

    res
      .cookie('accessToken', newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict', // Adjust sameSite attribute based on environment
        maxAge: 15 * 60 * 1000, // 15 minutes
      })
      .cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict', // Adjust sameSite attribute based on environment
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

    req.userId = user.id; // Set userId in request object
    next();
  };

  if (!accessToken) {
    generateNewTokens(); // await generateNewTokens(); if below function has,
  } else {
    // verify the access token
    let decodedToken;
    try {
      decodedToken = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET!) as { id: number };
      if (isNaN(decodedToken.id)) {
        return next(createError('You are not authenticated', 401, errorCode.unauthenticated));
      }
      req.userId = decodedToken.id;
      next();
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        generateNewTokens();
      } else {
        return next(createError('Invalid Access Token', 400, errorCode.attack));
      }
    }
  }
};
