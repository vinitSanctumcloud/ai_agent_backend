import { Request, Response } from 'express';
import User from '../models/userModel';
import jwt from 'jsonwebtoken';
import { IUserDocument } from '../models/userModel'; // Import user doc type
import aiAgentModel from '../models/aiAgentModel';

// Extend Express Request interface to include 'user'
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
        [key: string]: any;
      };
    }
  }
}
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
  files?: { [fieldname: string]: Express.Multer.File[] } | Express.Multer.File[];
}
// Ensure JWT_SECRET is defined
const JWT_SECRET = process.env.JWT_SECRET || '8f9a6b3c2d5e4f7a8b9c0d1e2f3a4b5c';
if (!JWT_SECRET) {
  console.error('Error: JWT_SECRET is not defined in environment variables');
  throw new Error('JWT_SECRET is required');
}

// Generate JWT token with type safety
const generateToken = (userId: string, role: string): string => {
  try {
    return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '1d' });
  } catch (error) {
    console.error('Error generating token:', error);
    throw new Error('Failed to generate token');
  }
};

export const signup = async (req: Request, res: Response): Promise<Response> => {
  const { email, name, password } = req.body;

  try {
    if (!email || !name || !password) {
      return res.status(400).json({ message: 'Email, name, and password are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const user: IUserDocument = new User({ email, name, password });
    await user.save();

    const token = generateToken(user?._id.toString(), user.role);

    return res.status(201).json({
      token,
      user: {
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Signup error:', error);
    return res.status(500).json({
      message: 'Error signing up',
      error: process.env.NODE_ENV === 'production' ? undefined : errorMessage,
    });
  }
};

export const login = async (req: Request, res: Response): Promise<Response> => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user: IUserDocument | null = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user._id.toString(), user.role);

    return res.status(200).json({
      token,
      user: {
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Login error:', error);
    return res.status(500).json({
      message: 'Error logging in',
      error: process.env.NODE_ENV === 'production' ? undefined : errorMessage,
    });
  }
};

export const checkAuth = (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'User not authenticated' });
  }

  return res.status(200).json({
    success: true,
    message: 'User is authenticated',
    user: req.user, // { id, role }
  });
};

// Get AI agent by slug (public access)
export const getUserAIAgent = async (req: Request, res: Response) => {
  try {
    const { aiAgentSlug } = req.params;

    if (!aiAgentSlug) {
      return res.status(400).json({
        success: false,
        message: 'AI agent slug is required in the URL path',
      });
    }

    const agent = await aiAgentModel.findOne({ aiAgentSlug }).select(
      '_id aiAgentName aiAgentSlug agentDescription domainExpertise colorTheme logoFile bannerFile createdAt currentStep greeting tone customRules conversationStarters languages enableFreeText enableBranchingLogic conversationFlow configFile manualEntry csvFile docFiles'
    );

    if (!agent) {
      return res.status(200).json({
        success: true,
        message: 'AI agent not found for the provided slug',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'AI agent retrieved successfully',
      data: agent,
    });
  } catch (error: unknown) {
    console.error('Error in getUserAIAgent:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: errorMessage,
    });
  }
};
