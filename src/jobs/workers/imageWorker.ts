import 'dotenv/config';
import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import sharp from 'sharp';
import path from 'path';

const connection = new Redis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  // password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
});

// Create a worker to process image optimization jobs
const imageWorker = new Worker(
  'imageQueue',
  async job => {
    const { filePath, outputFileName } = job.data;

    const optimizedImagePath = path.join(
      __dirname,
      '../../..',
      '/uploads/optimize',
      outputFileName
    );

    // Optimize the image using sharp
    await sharp(filePath).resize(200, 200).webp({ quality: 50 }).toFile(optimizedImagePath);

    return { optimizedImagePath };
  },
  { connection }
);

imageWorker.on('completed', job => {
  console.log(`Job ${job.id} has completed!`);
});

imageWorker.on('failed', (job, err) => {
  console.log(`Job ${job?.id} has failed with error ${err.message}`);
});
