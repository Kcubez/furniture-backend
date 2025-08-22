import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface CustomRequest extends Request {
  userId?: number;
}

export const auth = (req: CustomRequest, res: Response, next: NextFunction) => {
  const accessToken = req.cookies ? req.cookies.accessToken : null;
  const refreshToken = req.cookies ? req.cookies.refreshToken : null;
  if (!refreshToken) {
    const error: any = new Error('You are not authenticated.');
    error.status = 401; // Unauthorized
    error.code = 'UNAUTHORIZED';
    return next(error);
  }
  if (!accessToken) {
    const error: any = new Error('Access Token has expired.');
    error.status = 401; // Unauthorized
    error.code = 'ERROR_ACCESS_TOKEN_EXPIRED';
    return next(error);
  }

  // verify the access token
  let decodedToken;
  try {
    decodedToken = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET!) as { id: number };
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      error.message = 'Access Token has expired.';
      error.status = 401; // Unauthorized
      error.code = 'Error_Access_Token_Expired';
    } else {
      error.message = 'Invalid Access Token';
      error.status = 400; // Bad Request
      error.code = 'Error_Attack';
    }
  }
  req.userId = decodedToken!.id;
  next();
};
