import express from 'express';
import cors from 'cors'; // Add CORS for cross-origin requests
import dotenv from 'dotenv';
import publicRoutes from './routes/publicRoutes';
import protectedRoutes from './routes/protectedRoutes';
// import privateRoutes from './routes/privateRoutes';
import { connectDB } from './config/db';

// Load environment variables
dotenv.config();
console.log('JWT_SECRET:', process.env.JWT_SECRET); // Debug log

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors()); // Allow cross-origin requests (adjust as needed)
app.use(express.json());

// Routes
app.use('/api/auth', publicRoutes);
app.use('/protected', protectedRoutes);
// app.use('/private', privateRoutes);


// 404 Handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' }); // Fixed typo: 'founddd' to 'found'
});

// Error handling middleware for serverless compatibility
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: err.message || 'Unknown error',
  });
});

export default app;