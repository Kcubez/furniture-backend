import 'dotenv/config';
import { Worker } from 'bullmq';
import sharp from 'sharp';
import path from 'path';
import { redis } from '../../../config/redisClient';

const cacheWorker = new Worker(
  'cache-invalidation',
  async job => {
    const { pattern } = job.data;
    await invalidateCacheByPattern(pattern);
  },
  {
    connection: redis,
    concurrency: 5, // Process up to 5 jobs concurrently
  }
);

cacheWorker.on('completed', job => {
  console.log(`Job ${job.id} has completed!`);
});

cacheWorker.on('failed', (job, err) => {
  console.log(`Job ${job?.id} has failed with error ${err.message}`);
});

const invalidateCacheByPattern = async (pattern: string) => {
  try {
    const stream = redis.scanStream({
      match: pattern,
      count: 100,
    });
    const pipeline = redis.pipeline();
    let totalKeys = 0;

    // Process keys in batches
    stream.on('data', (keys: string[]) => {
      if (keys.length > 0) {
        keys.forEach(key => {
          pipeline.del(key);
          totalKeys += 1;
        });
      }
    });

    // Wrap stream events in a promise
    await new Promise<void>((resolve, reject) => {
      stream.on('end', async () => {
        try {
          if (totalKeys > 0) {
            await pipeline.exec();
            console.log(`Invalidated ${totalKeys} cache entries matching pattern: ${pattern}`);
          }
          resolve();
        } catch (execError) {
          reject(execError);
        }
      });

      stream.on('error', streamError => {
        reject(streamError);
      });
    });
  } catch (error) {
    console.error('Error invalidating cache:', error);
    throw error;
  }
};
