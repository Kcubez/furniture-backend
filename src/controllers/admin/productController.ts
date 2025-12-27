import { Request, Response, NextFunction } from 'express';
import { body, check, query, validationResult } from 'express-validator';
import { errorCode } from '../../../config/errorCode';
import { checkModelIfExist, checkUploadFile } from '../../utils/check';
import { createError } from '../../utils/error';
import { getUserById } from '../../services/authService';
import ImageQueue from '../../jobs/queues/imageQueue';
import {
  createOneProduct,
  deleteOneProduct,
  getProductById,
  updateOneProduct,
} from '../../services/productService';
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

export const updateProduct = [
  body('productId', 'Product Id is required').isInt({ min: 1 }),
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

    // Additional logic for creating a product goes here
    const { productId, name, description, price, discount, inventory, category, tags, type } =
      req.body;

    const product = await getProductById(+productId);
    if (!product) {
      if (req.files && req.files.length > 0) {
        const originalFiles = req.files.map((file: any) => file.filename);
        await removeFiles(originalFiles, null);
      }
      return next(createError('This data model does not exist', 404, errorCode.invalid));
    }

    let originalFileNames = [];
    if (req.files && req.files.length > 0) {
      originalFileNames = req.files.map((file: any) => ({ path: file.filename }));
    }

    const data: any = {
      productId,
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

    if (req.files && req.files.length > 0) {
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
      // delete old images
      const originalFiles = product.images.map(img => img.path);
      const optimizedFiles = product.images.map(img => img.path.split('.')[0] + '-optimized.webp');
      await removeFiles(originalFiles, optimizedFiles);
    }

    const updatedProduct = await updateOneProduct(product.id, data);
    await cacheQueue.add(
      'invalidate-product-cache',
      { pattern: 'products:*' },
      {
        jobId: `invalidate-post-cache-${Date.now()}`,
        priority: 1,
      }
    );

    res.status(200).json({
      message: req.t('Successfully updated the product'),
      productId: updatedProduct.id,
    });
  },
];

export const deleteProduct = [
  body('productId', 'Product Id is required').isInt({ min: 1 }),
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      return next(createError(errors[0]?.msg, 400, errorCode.invalid));
    }
    const { productId } = req.body;
    const product = await getProductById(+productId);
    checkModelIfExist(product);

    const productDeleted = await deleteOneProduct(product!.id);
    // delete old images
    const originalFiles = product!.images.map(img => img.path);
    const optimizedFiles = product!.images.map(img => img.path.split('.')[0] + '-optimized.webp');
    await removeFiles(originalFiles, optimizedFiles);

    await cacheQueue.add(
      'invalidate-product-cache',
      { pattern: 'products:*' },
      {
        jobId: `invalidate-post-cache-${Date.now()}`,
        priority: 1,
      }
    );

    res.status(200).json({
      message: req.t('Successfully deleted the post'),
      productId: productDeleted.id,
    });
  },
];
