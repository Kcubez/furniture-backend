import { Request, Response, NextFunction } from 'express';
import { body, query, validationResult } from 'express-validator';
import { errorCode } from '../../../config/errorCode';
import { checkUserIfNotExists } from '../../utils/auth';
import { checkUploadFile } from '../../utils/check';
import { createError } from '../../utils/error';

interface CustomRequest extends Request {
  userId?: any;
}

export const getPost = [
  body('title', 'Title is required')
    .trim()
    .notEmpty()
    .matches('^[\\w\\s]+$')
    .isLength({ min: 5, max: 100 }),
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      return next(createError(errors[0]?.msg, 400, errorCode.invalid));
    }

    // Additional logic for creating a post goes here
    const { title } = req.body;

    res.status(201).json({
      message: req.t('postCreated'),
    });
  },
];

export const getPostsByPagination = [
  body('title', 'Title is required')
    .trim()
    .notEmpty()
    .matches('^[\\w\\s]+$')
    .isLength({ min: 5, max: 100 }),
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      return next(createError(errors[0]?.msg, 400, errorCode.invalid));
    }

    // Additional logic for creating a post goes here
    const { title } = req.body;

    res.status(201).json({
      message: req.t('postCreated'),
    });
  },
];
