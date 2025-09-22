// app.ts
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import your routes and DB connection
import publicRoutes from './routes/publicRoutes';
import protectedRoutes from './routes/protectedRoutes';
import { connectDB } from './config/db';

// Load environment variables from .env file
dotenv.config();

// Fix __dirname for ES modules in TS
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app
const app = express();

// Connect to MongoDB
connectDB();

// Middleware for logging requests (optional, for debugging)
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`Request: ${req.method} ${req.url}`);
  next();
});

// Enable CORS (adjust options if needed)
app.use(cors());

// Serve static files from the 'Uploads' folder at route '/Uploads'
app.use('/Uploads', express.static(path.join(__dirname, 'Uploads')));

// Body parser middleware to parse JSON requests
app.use(express.json());

// Basic test route
app.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'Server is running' });
});

// Use your API routes
app.use('/api/auth', publicRoutes);
app.use('/protected', protectedRoutes);

// 404 handler for unknown routes
app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: 'Route not found' });
});

// General error handling middleware
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
