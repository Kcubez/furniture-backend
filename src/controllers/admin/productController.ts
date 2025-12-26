import { Request, Response, NextFunction } from 'express';
import { body, check, query, validationResult } from 'express-validator';
import { errorCode } from '../../../config/errorCode';
import { checkModelIfExist, checkUploadFile } from '../../utils/check';
import { createError } from '../../utils/error';
import { getUserById } from '../../services/authService';
import ImageQueue from '../../jobs/queues/imageQueue';
import { createOneProduct } from '../../services/productService';
import path from 'path';
import { unlink } from 'fs/promises';
import { checkUserIfNotExists } from '../../utils/auth';
import cacheQueue from '../../jobs/queues/cacheQueue';

interface CustomRequest extends Request {
  userId?: any;
  user?: any;
  files?: any;
}

const removeFiles = async (originalFiles: string[], optimizedFiles: string[] | null) => {
  try {
    for (const originalFile of originalFiles) {
      const originalFilePath = path.join(__dirname, '../../..', '/uploads/images', originalFile);
      await unlink(originalFilePath);
    }

    if (optimizedFiles) {
      for (const optimizedFile of optimizedFiles) {
        const optimizedFilePath = path.join(
          __dirname,
          '../../..',
          '/uploads/optimize',
          optimizedFile
        );
        await unlink(optimizedFilePath);
      }
    }
  } catch (err) {
    console.log(err);
  }
};

export const createProduct = [
  body('name', 'Name is required').trim().notEmpty().escape(),
  body('description', 'Description is required').trim().notEmpty().escape(),
  body('price', 'Price is required').isFloat({ min: 0.1 }).isDecimal({ decimal_digits: '1,2' }),
  body('discount', 'Discount is required').isFloat({ min: 0 }).isDecimal({ decimal_digits: '1,2' }),
  body('inventory', 'Inventory is required').isInt({ min: 1 }),
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
      if (req.files && req.files.length > 0) {
        const originalFiles = req.files.map((file: any) => file.filename);
        await removeFiles(originalFiles, null);
      }
      return next(createError(errors[0]?.msg, 400, errorCode.invalid));
    }

    // Additional logic for creating a post goes here
    const { name, description, price, discount, inventory, category, tags, type } = req.body;

    checkUploadFile(req.files && req.files.length > 0);

    await Promise.all(
      req.files.map(async (file: any) => {
        const splitFileName = file.filename.split('.')[0];
        return ImageQueue.add(
          'optimizeImage',
          {
            filePath: file.path,
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
      })
    );

    const originalFileNames = req.files.map((file: any) => ({ path: file.filename }));

    const data: any = {
      name,
      description,
      price,
      discount,
      inventory: +inventory,
      category,
      type,
      tags,
      images: originalFileNames,
    };

    const product = await createOneProduct(data);

    await cacheQueue.add(
      'invalidate-product-cache',
      { pattern: 'products:*' },
      {
        jobId: `invalidate-post-cache-${Date.now()}`,
        priority: 1,
      }
    );

    res.status(201).json({
      message: req.t('postCreated successfully'),
      productId: product.id,
    });
  },
];

// export const updateProduct = [
//   body('postId', 'Post ID is required').trim().notEmpty().isInt({ min: 1 }),
//   body('title', 'Title is required').trim().notEmpty().escape(),
//   body('content', 'content is required').trim().notEmpty().escape(),
//   body('body', 'body is required').trim().notEmpty().notEmpty(),
//   body('category', 'category is required').trim().notEmpty().escape(),
//   body('type', 'type is required').trim().notEmpty().escape(),
//   body('tags', 'tag is invalid')
//     .optional({ nullable: true })
//     .customSanitizer(value => {
//       if (value) {
//         return value.split(',').filter((tag: string) => tag.trim());
//       }
//       return value;
//     }),
//   async (req: CustomRequest, res: Response, next: NextFunction) => {
//     const errors = validationResult(req).array({ onlyFirstError: true });
//     if (errors.length > 0) {
//       if (req.file) {
//         await removeFiles(req.file.filename, null);
//       }
//       return next(createError(errors[0]?.msg, 400, errorCode.invalid));
//     }

//     // Additional logic for creating a post goes here
//     const { postId, title, content, body, category, type, tags } = req.body;
//     const user = req.user;
//     // const userId = req.userId;
//     // const user = await getUserById(userId!);
//     // if (!user) {
//     //   if (req.file) {
//     //     await removeFiles(req.file.filename, null);
//     //   }
//     //   return next(
//     //     createError('User not found with this phone number', 401, errorCode.unauthenticated)
//     //   );
//     // }

//     const post = await getPostById(+postId); // "7" -> 7
//     if (!post) {
//       if (req.file) {
//         await removeFiles(req.file.filename, null);
//       }
//       return next(createError('Post not found', 404, errorCode.invalid));
//     }

//     // admin A ----> Post A --> update/delete
//     // admin B ----> Post A --> not allowed
//     if (user.id !== post.authorId) {
//       if (req.file) {
//         await removeFiles(req.file.filename, null);
//       }
//       return next(createError('This action is not allowed', 404, errorCode.unauthorised));
//     }

//     const data: any = {
//       title,
//       content,
//       body,
//       image: req.file,
//       category,
//       type,
//       tags,
//     };

//     if (req.file) {
//       data.image = req.file.filename;
//       const splitFileName = req.file.filename.split('.')[0];
//       await ImageQueue.add(
//         'optimizeImage',
//         {
//           filePath: req.file.path,
//           outputFileName: `${splitFileName}-optimized.webp`,
//           width: 835,
//           height: 577,
//           quality: 100,
//         },
//         {
//           attempts: 3,
//           backoff: {
//             type: 'exponential',
//             delay: 1000, // 1 seconds
//           },
//         }
//       );
//       const optimizedFile = post.image.split('.')[0] + '-optimized.webp';
//       await removeFiles(post.image, optimizedFile);
//     }
//     const updatedPost = await updateOnePost(post.id, data);

//     await cacheQueue.add(
//       'invalidate-post-cache',
//       { pattern: 'posts*' },
//       {
//         jobId: `invalidate-post-cache-${Date.now()}`,
//         priority: 1,
//       }
//     );

//     res.status(200).json({
//       message: req.t('Successfully updated the post'),
//       postId: updatedPost.id,
//     });
//   },
// ];

// export const deleteProduct = [
//   body('postId', 'Post ID is required').isInt({ gt: 0 }),
//   async (req: CustomRequest, res: Response, next: NextFunction) => {
//     const errors = validationResult(req).array({ onlyFirstError: true });
//     if (errors.length > 0) {
//       return next(createError(errors[0]?.msg, 400, errorCode.invalid));
//     }

//     // Additional logic for creating a post goes here
//     const { postId } = req.body;
//     // const userId = req.userId;
//     // const user = await getUserById(userId!);
//     // checkUserIfNotExists(user);
//     const user = req.user;

//     const post = await getPostById(+postId); // "7" -> 7
//     checkModelIfExist(post);

//     // admin A ----> Post A --> update/delete
//     // admin B ----> Post A --> not allowed
//     if (user!.id !== post!.authorId) {
//       return next(createError('This action is not allowed', 404, errorCode.unauthorised));
//     }

//     const postDeleted = await deleteOnePost(post!.id);
//     const optimizedFile = post!.image.split('.')[0] + '-optimized.webp';
//     await removeFiles(post!.image, optimizedFile);

//     await cacheQueue.add(
//       'invalidate-post-cache',
//       { pattern: 'posts*' },
//       {
//         jobId: `invalidate-post-cache-${Date.now()}`,
//         priority: 1,
//       }
//     );

//     res.status(201).json({
//       message: req.t('Successfully deleted the post'),
//       postId: postDeleted.id,
//     });
//   },
// ];
