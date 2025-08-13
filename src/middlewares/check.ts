import { Request, Response, NextFunction } from 'express';

interface CheckRequest extends Request {
  userId?: number;
}

export const check = (req: CheckRequest, res: Response, next: NextFunction) => {
  //   const err: any = new Error('Token is expired');
  //   err.status = 401;
  //   err.code = 'TOKEN_EXPIRED';
  //   return next(err);

  req.userId = 123456;
  next();
};
