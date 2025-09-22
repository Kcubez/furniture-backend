import { NextFunction, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { errorCode } from '../../../config/errorCode';
import { createError } from '../../utils/error';
import { createOrUpdateSettingStatus } from '../../services/settingService';

interface CustomRequest extends Request {
  user?: any;
}

export const setMaintenanceMode = [
  body('mode', 'Mode must be boolean').isBoolean(),
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      return next(createError(errors[0]?.msg, 400, errorCode.invalid));
    }

    const { mode } = req.body;
    const value = mode ? 'true' : 'false';
    const message = mode
      ? 'Successfully enabled maintenance mode'
      : 'Successfully disabled maintenance mode';
    await createOrUpdateSettingStatus('maintenance_mode', value);
    res.json({ message });
  },
];
