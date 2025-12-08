import { Request, Response, NextFunction } from 'express';
import { body, check, query, validationResult } from 'express-validator';
import { errorCode } from '../../../config/errorCode';
import { checkModelIfExist, checkUploadFile } from '../../utils/check';
import { createError } from '../../utils/error';
import { getUserById } from '../../services/authService';
import ImageQueue from '../../jobs/queues/imageQueue';
import {
  createOnePost,
  deleteOnePost,
  getPostById,
  PostArgs,
  updateOnePost,
} from '../../services/postService';
import sanitizeHtml from 'sanitize-html';
import path from 'path';
import { unlink } from 'fs/promises';
import { checkUserIfNotExists } from '../../utils/auth';

interface CustomRequest extends Request {
  userId?: any;
}

const removeFiles = async (originalFile: string, optimizedFile: string | null) => {
  try {
    const originalFilePath = path.join(__dirname, '../../..', '/uploads/images', originalFile);

    await unlink(originalFilePath);

    if (optimizedFile) {
      const optimizedFilePath = path.join(
        __dirname,
        '../../..',
        '/uploads/optimize',
        optimizedFile
      );
      await unlink(optimizedFilePath);
    }
  } catch (err) {
    console.log(err);
  }
};

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
  body('body', 'body is required')
    .trim()
    .notEmpty()
    .customSanitizer(value => sanitizeHtml(value))
    .notEmpty(),
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
      if (req.file) {
        await removeFiles(req.file.filename, null);
      }
      return next(createError(errors[0]?.msg, 400, errorCode.invalid));
    }

    // Additional logic for creating a post goes here
    const { title, content, body, category, type, tags } = req.body;
    const userId = req.userId;
    checkUploadFile(req.file);
    const user = await getUserById(userId!);
    if (!user) {
      if (req.file) {
        await removeFiles(req.file.filename, null);
      }
      return next(
        createError('User not found with this phone number', 401, errorCode.unauthenticated)
      );
    }

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
  body('postId', 'Post ID is required').trim().notEmpty().isInt({ min: 1 }),
  body('title', 'Title is required').trim().notEmpty().escape(),
  body('content', 'content is required').trim().notEmpty().escape(),
  body('body', 'body is required')
    .trim()
    .notEmpty()
    .customSanitizer(value => sanitizeHtml(value))
    .notEmpty(),
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
      if (req.file) {
        await removeFiles(req.file.filename, null);
      }
      return next(createError(errors[0]?.msg, 400, errorCode.invalid));
    }

    // Additional logic for creating a post goes here
    const { postId, title, content, body, category, type, tags } = req.body;
    const userId = req.userId;
    const user = await getUserById(userId!);
    if (!user) {
      if (req.file) {
        await removeFiles(req.file.filename, null);
      }
      return next(
        createError('User not found with this phone number', 401, errorCode.unauthenticated)
      );
    }

    const post = await getPostById(+postId); // "7" -> 7
    if (!post) {
      if (req.file) {
        await removeFiles(req.file.filename, null);
      }
      return next(createError('Post not found', 404, errorCode.invalid));
    }

    // admin A ----> Post A --> update/delete
    // admin B ----> Post A --> not allowed
    if (user.id !== post.authorId) {
      if (req.file) {
        await removeFiles(req.file.filename, null);
      }
      return next(createError('This action is not allowed', 404, errorCode.unauthorised));
    }

    const data: any = {
      title,
      content,
      body,
      image: req.file,
      category,
      type,
      tags,
    };

    if (req.file) {
      data.image = req.file.filename;
      const splitFileName = req.file.filename.split('.')[0];
      await ImageQueue.add(
        'optimizeImage',
        {
          filePath: req.file.path,
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
      const optimizedFile = post.image.split('.')[0] + '-optimized.webp';
      await removeFiles(post.image, optimizedFile);
    }
    const updatedPost = await updateOnePost(post.id, data);

    res.status(200).json({
      message: req.t('Successfully updated the post'),
      postId: updatedPost.id,
    });
  },
];

export const deletePost = [
  body('postId', 'Post ID is required').trim().notEmpty().isInt({ min: 1 }),
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      return next(createError(errors[0]?.msg, 400, errorCode.invalid));
    }

    // Additional logic for creating a post goes here
    const { postId } = req.body;
    const userId = req.userId;
    const user = await getUserById(userId!);
    checkUserIfNotExists(user);

    const post = await getPostById(+postId); // "7" -> 7
    checkModelIfExist(post);

    // admin A ----> Post A --> update/delete
    // admin B ----> Post A --> not allowed
    if (user!.id !== post!.authorId) {
      return next(createError('This action is not allowed', 404, errorCode.unauthorised));
    }

    const postDeleted = await deleteOnePost(post!.id);
    const optimizedFile = post!.image.split('.')[0] + '-optimized.webp';
    await removeFiles(post!.image, optimizedFile);

    res.status(201).json({
      message: req.t('Successfully deleted the post'),
      postId: postDeleted.id,
    });
  },
];
