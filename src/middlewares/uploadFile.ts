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
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
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
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB file size limit
});

export default upload;
