import { Request, Response, NextFunction } from 'express';
import { check, param, query, validationResult } from 'express-validator';
import { errorCode } from '../../../config/errorCode';
import { checkUserIfNotExists } from '../../utils/auth';
import { createError } from '../../utils/error';
import { getUserById } from '../../services/authService';
import { getPostById, getPostsList, getPostWithRelations } from '../../services/postService';
import { getOrSetCache } from '../../utils/cache';
import { checkModelIfExist } from '../../utils/check';

interface CustomRequest extends Request {
  userId?: number;
}

export const getPost = [
  param('id', 'Post ID is required').isInt({ gt: 0 }),

  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      return next(createError(errors[0]?.msg, 400, errorCode.invalid));
    }

    // Additional logic for creating a post goes here
    const postId = req.params.id;
    const userId = req.userId;
    const user = await getUserById(userId!);
    checkUserIfNotExists(user);

    // const post = await getPostWithRelations(+postId!); // "7" -> 7
    const cacheKey = `posts:${JSON.stringify(+postId!)}`;
    const post = await getOrSetCache(cacheKey, async () => {
      return await getPostWithRelations(+postId!);
    });

    checkModelIfExist(post);

    // const modifiedPost = {
    //   id: post?.id,
    //   title: post?.title,
    //   content: post?.content,
    //   body: post?.body,
    //   image: '/optimize/' + post?.image.split('.')[0] + '.webp',
    //   updatedAt: post?.updatedAt.toLocaleDateString('en-US', {
    //     year: 'numeric',
    //     month: 'long',
    //     day: 'numeric',
    //   }),
    //   author: (post?.author.firstName ?? '') + ' ' + (post?.author.lastName ?? ''),
    //   category: post?.category.name,
    //   type: post?.type.name,
    //   tags: post?.tags && post?.tags.length > 0 ? post?.tags.map(tag => tag.name) : null,
    // };

    res.status(200).json({
      message: req.t('Post details fetched successfully'),
      post,
    });
  },
];

// Offset Pagination
export const getPostsByPagination = [
  query('page', 'page number must be a positive integer').optional().isInt({ gt: 0 }),
  query('limit', 'limit number must be a positive integer').isInt({ gt: 4 }).optional(),
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      return next(createError(errors[0]?.msg, 400, errorCode.invalid));
    }

    // Additional logic for creating a post goes here
    const page = req.query.page || 1;
    const limit = req.query.limit || 5;

    const userId = req.userId;
    const user = await getUserById(userId!);
    checkUserIfNotExists(user);

    const skip = (Number(page) - 1) * Number(limit); //1-1 *5=0, 2-1*5=5

    const options = {
      skip,
      take: Number(limit) + 1,
      select: {
        id: true,
        title: true,
        content: true,
        body: true,
        image: true,
        updatedAt: true,
        author: {
          select: {
            fullName: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    };

    // const posts = await getPostsList(options);
    const cacheKey = `posts:${JSON.stringify(req.query)}`;
    const posts = await getOrSetCache(cacheKey, async () => {
      return await getPostsList(options);
    });

    const hasNextPage = posts.length > Number(limit); //6>5 true //
    let nextPage = null;
    const previousPage = Number(page) > 1 ? Number(page) - 1 : null;

    if (hasNextPage) {
      posts.pop(); //remove last item
      nextPage = Number(page) + 1;
    }

    res.status(201).json({
      message: req.t('Get posts by pagination successfully'),
      currentPage: page,
      previousPage,
      hasNextPage,
      nextPage,
      posts,
    });
  },
];

export const getInfinitePostsByPagination = [
  query('cursor', 'cursor must be post ID').optional().isInt({ gt: 0 }),
  query('limit', 'limit number must be a positive integer').isInt({ gt: 4 }).optional(),
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      return next(createError(errors[0]?.msg, 400, errorCode.invalid));
    }

    // Additional logic for creating a post goes here
    const lastCursor = req.query.cursor;
    const limit = req.query.limit || 5;

    const userId = req.userId;
    const user = await getUserById(userId!);
    checkUserIfNotExists(user);

    const options = {
      take: Number(limit) + 1,
      skip: lastCursor ? 1 : 0,
      cursor: lastCursor ? { id: Number(lastCursor) } : undefined,
      select: {
        id: true,
        title: true,
        content: true,
        image: true,
        updatedAt: true,
        author: {
          select: {
            fullName: true,
          },
        },
      },
      orderBy: {
        id: 'asc',
      },
    };

    // const posts = await getPostsList(options);
    const cacheKey = `posts:${JSON.stringify(req.query)}`;
    const posts = await getOrSetCache(cacheKey, async () => {
      return await getPostsList(options);
    });

    const hasNextPage = posts.length > Number(limit); //6>5 true //
    if (hasNextPage) {
      posts.pop(); //remove last item
    }

    const newCursor = posts.length > 0 ? posts[posts.length - 1]?.id : null;

    res.status(201).json({
      message: req.t('Get All infinite posts by pagination successfully'),
      hasNextPage,
      newCursor,
      posts,
    });
  },
];
