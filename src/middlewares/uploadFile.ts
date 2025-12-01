import { Request } from 'express';
import multer, { FileFilterCallback } from 'multer';

const fileStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/images');
    /* const type = file.mimetype.split('/')[0];
    if (type === 'image') {
      cb(null, 'uploads/images');
    } else if (type === 'video') {
      cb(null, 'uploads/videos');
    } else {
      cb(null, 'uploads/files');
    } */
  },
  filename: function (req, file, cb) {
    const ext = file.mimetype.split('/')[1];
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9) + '.' + ext;
    cb(null, uniqueSuffix);
  },
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  if (
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/jpeg'
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

const upload = multer({
  storage: fileStorage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB file size limit
});

export const uploadMemory = multer({
  storage: multer.memoryStorage(),
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB file size limit, so image optimization is neeeded.
});

export default upload;
