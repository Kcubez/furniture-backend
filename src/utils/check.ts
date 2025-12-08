import { errorCode } from '../../config/errorCode';

export const checkUploadFile = (file: any) => {
  if (!file) {
    const error: any = new Error('Invalid image');
    error.status = 409;
    error.code = errorCode.invalid;
    throw error; // This will be caught by the error handling middleware
  }
};

export const checkModelIfExist = (model: any) => {
  if (!model) {
    const error: any = new Error('This model does not exit');
    error.status = 409;
    error.code = errorCode.invalid;
    throw error; // This will be caught by the error handling middleware
  }
};
