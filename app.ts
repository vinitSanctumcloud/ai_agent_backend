import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Import your routes and DB connection
import publicRoutes from './routes/publicRoutes';
import protectedRoutes from './routes/protectedRoutes';
import { connectDB } from './config/db';
import authMiddleware from './middlewares/authMiddleware';

// Load environment variables from .env file
dotenv.config();

// Since __dirname is available in CommonJS, use it directly.
// If __dirname is not recognized (rare in TypeScript CommonJS), you can do:
const uploadsPath = path.resolve(__dirname, '../Uploads'); // Resolve relative to this file

console.log('Serving static files from:', uploadsPath);

// Initialize Express app
const app = express();

// Connect to MongoDB
connectDB();

// Middleware for logging requests (optional, useful for debugging)
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`Request: ${req.method} ${req.url}`);
  next();
});

// Enable CORS
app.use(cors());

// ✅ Static Files Middleware
// Serve static files from 'Uploads' folder at '/Uploads' route
app.use(
  '/Uploads',
  (req, _res, next) => {
    console.log('Static file request:', req.url);
    next();
  },
  express.static(uploadsPath)
);

// Body parser middleware
app.use(express.json());

// Basic test route
app.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'Server is running' });
});

// ✅ Test file serving (manual test route)
app.get('/test-file', (_req: Request, res: Response) => {
  const testFilePath = path.join(uploadsPath, 'test.txt');
  res.sendFile(testFilePath);
});

// API routes
app.use('/api/auth', publicRoutes);
app.use('/protected', protectedRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler
app.use(
  (
    err: any,
    _req: Request,
    res: Response,
    _next: NextFunction
  ) => {
    console.error('Error:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: err?.message || 'Unknown error',
    });
  }
);

export default app;
