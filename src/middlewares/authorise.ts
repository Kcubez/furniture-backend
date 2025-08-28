import { Request, Response, NextFunction } from 'express';
import { getUserById } from '../services/authService';
import { errorCode } from '../../config/errorCode';

interface CustomRequest extends Request {
  userId?: number;
  user?: any;
}

// authorise (true, 'ADMIN', 'AUTHOR') // deny - "USER"
// authorise (false, "USER") // allow - 'ADMIN', 'AUTHOR'
export const authorise = (permission: Boolean, ...roles: String[]) => {
  return async (req: CustomRequest, res: Response, next: NextFunction) => {
    const userId = req.userId;
    const user = await getUserById(userId!);
    if (!user) {
      const error: any = new Error('This account has not registered.');
      error.status = 401;
      error.code = errorCode.unauthenticated;
      return next(error);
    }

    const result = roles.includes(user.role);

    if (permission && !result) {
      const error: any = new Error('You are not authorised to access this resource.');
      error.status = 403; // Forbidden
      error.code = errorCode.unauthorised;
      return next(error);
    }

    if (!permission && result) {
      const error: any = new Error('You are not authorised to access this resource.');
      error.status = 403; // Forbidden
      error.code = errorCode.unauthorised;
      return next(error);
    }

    req.user = user;

    next();
  };
};
