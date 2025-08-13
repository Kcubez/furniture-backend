import { NextFunction, Request, Response } from 'express';

interface CheckRequest extends Request {
  userId?: number;
}

export const healthCheck = (req: CheckRequest, res: Response, next: NextFunction) => {
  res.status(200).json({ message: 'We are ready for sending responses!', userId: req.userId });
};
