import { Request, Response, NextFunction } from 'express';
import { body, check, query, validationResult } from 'express-validator';
import { errorCode } from '../../../config/errorCode';
import { checkUserIfNotExists } from '../../utils/auth';
import { checkUploadFile } from '../../utils/check';
import { createError } from '../../utils/error';
import { getUserById } from '../../services/authService';
import ImageQueue from '../../jobs/queues/imageQueue';
import { createOnePost, PostArgs } from '../../services/postService';

interface CustomRequest extends Request {
  userId?: any;
}

// model Post {
//     id         Int      @id @default(autoincrement())
//     title      String   @db.VarChar(255)
//     content    String
//     body       String
//     image      String
//     authorId   Int
//     categoryId Int
//     typeId     Int
//     createdAt  DateTime @default(now())
//     updatedAt  DateTime   @updatedAt
//     user       User     @relation(fields: [authorId], references: [id])
//     category   Category @relation(fields: [categoryId], references: [id])
//     type       Type     @relation(fields: [typeId], references: [id])
//     tags       PostTag[]
//   }

export const createPost = [
  body('title', 'Title is required').trim().notEmpty().escape(),
  body('content', 'content is required').trim().notEmpty().escape(),
  body('body', 'body is required').trim().notEmpty().escape(),
  body('category', 'category is required').trim().notEmpty().escape(),
  body('type', 'type is required').trim().notEmpty().escape(),
  body('tags', 'tag is invalid')
    .optional({ nullable: true })
    .customSanitizer(value => {
      if (value) {
        return value.split(',').filter((tag: string) => tag.trim());
      }
      return value;
    }),
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      return next(createError(errors[0]?.msg, 400, errorCode.invalid));
    }

    // Additional logic for creating a post goes here
    const { title, content, body, category, type, tags } = req.body;
    const userId = req.userId;
    const image = req.file;
    const user = await getUserById(userId!);
    checkUserIfNotExists(user);
    checkUploadFile(image);

    const splitFileName = req.file!.filename.split('.')[0];

    await ImageQueue.add(
      'optimizeImage',
      {
        filePath: req.file?.path,
        outputFileName: `${splitFileName}-optimized.webp`,
        width: 835,
        height: 577,
        quality: 100,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000, // 1 seconds
        },
      }
    );

    const data: PostArgs = {
      title,
      content,
      body,
      image: req.file!.filename,
      authorId: user!.id,
      category,
      type,
      tags,
    };

    const post = await createOnePost(data);

    res.status(201).json({
      message: req.t('postCreated successfully'),
      postId: post.id,
    });
  },
];

export const updatePost = [
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

export const deletePost = [
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
