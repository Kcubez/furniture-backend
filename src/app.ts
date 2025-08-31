import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { limiter } from './middlewares/rateLimiter';
import { Request, Response, NextFunction } from 'express';
import routes from './routes/v1';
// import * as errorController from './controllers/web/errorController';

import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import middleware from 'i18next-http-middleware';
import path from 'path';

export const app = express();

app.set('view engine', 'ejs'); // Set view engine to EJS
app.set('views', './src/views'); // Set views directory

var whitelist = ['http://example1.com', 'http://localhost:5173']; // Replace with your allowed origins
var corsOptions = {
  origin: function (origin: any, callback: (err: Error | null, origin?: any) => void) {
    if (!origin) {
      // Allow requests with no origin (like mobile apps or curl requests)
      return callback(null, true);
    }
    if (whitelist.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow credentials (cookies, authorization headers, etc.)
};

// Logging
app.use(morgan('dev')); // Logging (see all requests in console)

// Body parsers
app.use(express.urlencoded({ extended: true })); // For form data
app.use(express.json()); // For JSON data

// Cookie parser
app.use(cookieParser()); // Parse cookies

// CORS
app.use(cors(corsOptions)); // Allow all origins

// Security & performance
app.use(helmet()); // Security headers
app.use(compression()); // Compress responses

// Rate limiting
app.use(limiter); // Limit requests to prevent abuse

// i18next configuration
i18next
  .use(Backend)
  .use(middleware.LanguageDetector)
  .init({
    backend: {
      loadPath: path.join(process.cwd(), 'src/locales', '{{lng}}', '{{ns}}.json'),
    },
    detection: {
      order: ['querystring', 'cookie'],
      caches: ['cookie'],
    },
    fallbackLng: 'en',
    preload: ['en', 'mm'], // Preload all languages
  });
app.use(middleware.handle(i18next));

app.use(express.static('public')); // Serve static files from 'public' directory

// Routes
// app.use('/api/v1', healthRoutes);
// app.use(viewRoutes);
// app.use(errorController.notFound); // Handle 404 errors

// app.use('/api/v1', authRoutes);
// app.use('/api/v1/admins', auth, authorise(true, 'ADMIN'), adminRoutes);
// app.use('/api/v1', profileRoutes);

app.use(routes);

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err.status || 500;
  const message = err.message || 'Internal Server Error';
  const errorCode = err.code || 'ERROR CODE';
  res.status(statusCode).json({ message, errorCode });
});
