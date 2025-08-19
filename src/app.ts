import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import morgan from 'morgan';
import { limiter } from './middlewares/rateLimiter';
import healthRoutes from './routes/v1/health';
import { Request, Response, NextFunction } from 'express';
import viewRoutes from './routes/v1/web/view';
import * as errorController from './controllers/web/errorController';

export const app = express();

app.set('view engine', 'ejs'); // Set view engine to EJS
app.set('views', './src/views'); // Set views directory

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

app.use(express.static('public')); // Serve static files from 'public' directory

// Routes
app.use('/api/v1', healthRoutes);
app.use(viewRoutes);
app.use(errorController.notFound); // Handle 404 errors

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err.status || 500;
  const message = err.message || 'Internal Server Error';
  const errorCode = err.code || 'ERROR CODE';
  res.status(statusCode).json({ message, errorCode });
});
