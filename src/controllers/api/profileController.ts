import { Request, Response, NextFunction } from 'express';
import { body, query, validationResult } from 'express-validator';
import { unlink } from 'node:fs/promises';
import path from 'path';

import { errorCode } from '../../../config/errorCode';
import { getUserById, updateUser } from '../../services/authService';
import { checkUserIfNotExists } from '../../utils/auth';
import { authorise } from '../../utils/authorise';
import { checkUploadFile } from '../../utils/check';

interface CustomRequest extends Request {
  userId?: number;
}

export const changeLanguage = [
  query('lng', 'Invalid Language Code')
    .trim()
    .notEmpty()
    .matches('^[a-z]+$')
    .isLength({ min: 2, max: 3 }),
  (req: CustomRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      const error: any = new Error(errors[0]?.msg);
      error.status = 400; // Unprocessable Entity
      error.code = errorCode.invalid;
      return next(error);
    }

    const { lng } = req.query;
    res.cookie('i18next', lng);
    res.status(200).json({
      message: req.t('changeLanguage', { lang: lng }),
    });
  },
];

export const testPermission = async (req: CustomRequest, res: Response, next: NextFunction) => {
  const userId = req.userId;
  const user = await getUserById(userId!);
  checkUserIfNotExists(user);

  const info: any = {
    title: 'Permission Test',
  };

  const can = authorise(true, user!.role, 'AUTHOR');
  if (can) {
    info.content = 'You have permission to read this line.';
  }

  res.status(200).json({
    info,
  });
};

export const uploadProfile = async (req: CustomRequest, res: Response, next: NextFunction) => {
  const userId = req.userId;
  const image = req.file;
  const user = await getUserById(userId!);
  checkUserIfNotExists(user);
  checkUploadFile(image);

  // console.log(image);
  const fileName = image!.filename;
  // const filePath = image!.path.replace('\\', '/');
  // const filePath = path.join(__dirname, '../../..', '/uploads/images', user!.image!);

  if (user?.image) {
    try {
      const filePath = path.join(__dirname, '../../..', '/uploads/images', user!.image!);
      await unlink(filePath);
    } catch (err) {
      console.log(err);
    }
  }

  const userData = {
    image: fileName,
  };
  await updateUser(user?.id!, userData);

  res.status(200).json({ message: 'profile picture uploaded successfully' });
};
