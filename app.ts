// app.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import publicRoutes from './routes/publicRoutes';
import protectedRoutes from './routes/protectedRoutes';
// import privateRoutes from './routes/privateRoutes'; // Uncomment if needed
import { connectDB } from './config/db';
import { Request, Response, NextFunction } from 'express';
import path from 'path';

// Load environment variables
dotenv.config();
console.log('JWT_SECRET:', process.env.JWT_SECRET); // Debug log

const app = express();

// Connect to MongoDB
connectDB();

// Middleware for logging incoming requests (for debugging)
app.use((req, res, next) => {
  console.log(`Request: ${req.method} ${req.url}`);
  next();
});

// Other middleware
app.use(cors()); // Allow cross-origin requests (adjust as needed)
app.use('/Uploads', express.static(path.join(__dirname, 'Uploads')));
app.use(express.json());

// Simple test route for verifying deployment
app.get('/', (req, res) => {
  res.json({ message: 'Server is running' });
});

// Routes
app.use('/api/auth', publicRoutes);
app.use('/protected', protectedRoutes);
// app.use('/private', privateRoutes); // Uncomment if needed

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);

  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: err?.message || 'Unknown error',
  });
});


export default app;