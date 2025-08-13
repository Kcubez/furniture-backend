import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import morgan from 'morgan';
import { limiter } from './middlewares/rateLimiter';
import healthRoutes from './routes/v1/health';
import { Request, Response, NextFunction } from 'express';

export const app = express();

// Logging
app.use(morgan('dev')); // Logging (see all requests in console)
// Body parsers
app.use(express.urlencoded({ extended: true })); // For form data
app.use(express.json()); // For JSON data

// CORS
app.use(cors()); // Allow all origins

// Security & performance
app.use(helmet()); // Security headers
app.use(compression()); // Compress responses

// Rate limiting
app.use(limiter); // Limit requests to prevent abuse

// Routes
app.use('/api/v1', healthRoutes);

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err.status || 500;
  const message = err.message || 'Internal Server Error';
  const errorCode = err.code || 'ERROR CODE';
  res.status(statusCode).json({ message, errorCode });
});
