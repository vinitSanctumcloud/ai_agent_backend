import { Request, Response } from 'express';

import multer from 'multer';
import path from 'path';
import { mkdirSync } from 'fs';
import aiAgentModel from '../models/aiAgentModel';
import mongoose from 'mongoose';

// Determine the project root directory
const projectRoot = path.resolve(__dirname, '../..');

// Create upload directories in the project root
const ensureDirectories = () => {
  const directories = [
    path.join(projectRoot, 'Uploads/images'),
    path.join(projectRoot, 'Uploads/csv'),
    path.join(projectRoot, 'Uploads/docs'),
    path.join(projectRoot, 'Uploads/config'),
  ];
  directories.forEach(dir => {
    console.log(`Ensuring directory exists: ${dir}`);
    mkdirSync(dir, { recursive: true });
  });
};
ensureDirectories();

// Extend Request interface to include Multer files
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
  files?: { [fieldname: string]: Express.Multer.File[] } | Express.Multer.File[];
}

// Interface for request body validation
interface CreateAIAgentStepOneRequest {
  aiAgentName: string;
  agentDescription: string;
  domainExpertise: string;
  colorTheme: string;
}

interface UpdateAIAgentStepTwoRequest {
  greeting?: string;
  tone?: string;
  customRules?: string;
  conversationStarters?: string[];
  languages?: string;
  enableFreeText?: boolean;
  enableBranchingLogic?: boolean;
  conversationFlow?: string;
  configFile?: string | null;
}

interface UpdateAIAgentStepThreeRequest {
  manualEntry?: Array<{
    question: string;
    answer: string;
  }>;
  csvFile?: string | null;
  docFiles?: string[];
}

// Configure Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let destination: string;
    if (file.fieldname === 'logoFile' || file.fieldname === 'bannerFile') {
      destination = path.join(projectRoot, 'Uploads/images');
    } else if (file.fieldname === 'csvFile') {
      destination = path.join(projectRoot, 'Uploads/csv');
    } else if (file.fieldname === 'docFiles') {
      destination = path.join(projectRoot, 'Uploads/docs');
    } else if (file.fieldname === 'configFile') {
      destination = path.join(projectRoot, 'Uploads/config');
    } else {
      console.error(`Invalid field name: ${file.fieldname}`);
      return cb(new Error('Invalid field name'), '');
    }
    console.log(`Saving file ${file.originalname} to ${destination}`);
    cb(null, destination);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`;
    console.log(`Generated filename: ${filename}`);
    cb(null, filename);
  }
});

// File filter to validate file types
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  console.log(`Processing file: ${file.originalname}, mimetype: ${file.mimetype}, fieldname: ${file.fieldname}`);
  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif'];
  const allowedCsvTypes = ['text/csv', 'application/vnd.ms-excel'];
  const allowedDocTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  const allowedConfigTypes = ['application/json', 'text/plain'];

  if (file.fieldname === 'logoFile' || file.fieldname === 'bannerFile') {
    if (allowedImageTypes.includes(file.mimetype)) {
      console.log(`File ${file.originalname} accepted as image`);
      cb(null, true);
    } else {
      console.error(`File ${file.originalname} rejected: Invalid image type`);
      cb(new Error('Invalid file type for logoFile or bannerFile. Only JPEG, PNG, and GIF are allowed.'));
    }
  } else if (file.fieldname === 'csvFile') {
    if (allowedCsvTypes.includes(file.mimetype)) {
      console.log(`File ${file.originalname} accepted as CSV`);
      cb(null, true);
    } else {
      console.error(`File ${file.originalname} rejected: Invalid CSV type`);
      cb(new Error('Invalid file type for csvFile. Only CSV files are allowed.'));
    }
  } else if (file.fieldname === 'docFiles') {
    if (allowedDocTypes.includes(file.mimetype)) {
      console.log(`File ${file.originalname} accepted as document`);
      cb(null, true);
    } else {
      console.error(`File ${file.originalname} rejected: Invalid document type`);
      cb(new Error('Invalid file type for docFiles. Only PDF, DOC, and DOCX are allowed.'));
    }
  } else if (file.fieldname === 'configFile') {
    if (allowedConfigTypes.includes(file.mimetype)) {
      console.log(`File ${file.originalname} accepted as config file`);
      cb(null, true);
    } else {
      console.error(`File ${file.originalname} rejected: Invalid config type`);
      cb(new Error('Invalid file type for configFile. Only JSON or text files are allowed.'));
    }
  } else {
    console.error(`File ${file.originalname} rejected: Unexpected field name`);
    cb(new Error('Unexpected field name'));
  }
};

// Initialize Multer with configuration
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per file
  },
});

// Middleware for Step 1 file uploads (logoFile and optional bannerFile)
const uploadStepOne = upload.fields([
  { name: 'logoFile', maxCount: 1 },
  { name: 'bannerFile', maxCount: 1 },
]);

// Middleware for Step 2 file uploads (optional configFile)
const uploadStepTwo = upload.fields([
  { name: 'configFile', maxCount: 1 },
]);

// Middleware for Step 3 file uploads (optional csvFile and multiple docFiles)
const uploadStepThree = upload.fields([
  { name: 'csvFile', maxCount: 1 },
  { name: 'docFiles', maxCount: 10 },
]);

// Step 1: Create AIAgent with required fields, limit to one per user
export const createAIAgentStepOne = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { aiAgentName, agentDescription, domainExpertise, colorTheme }: CreateAIAgentStepOneRequest = req.body;

    // Ensure user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'User must be authenticated',
      });
    }

    // Check if user already has an AI agent
    const existingAgent = await aiAgentModel.findOne({ userId: req.user.id });
    if (existingAgent) {
      return res.status(200).json({
        success: true,
        message: 'AI agent already exists for this user',
        data: {
          _id: existingAgent._id,
          aiAgentName: existingAgent.aiAgentName,
          aiAgentSlug: existingAgent.aiAgentSlug,
          agentDescription: existingAgent.agentDescription,
          domainExpertise: existingAgent.domainExpertise,
          colorTheme: existingAgent.colorTheme,
          logoFile: existingAgent.logoFile,
          bannerFile: existingAgent.bannerFile,
          userId: existingAgent.userId,
          createdAt: existingAgent.createdAt,
          currentStep: existingAgent.currentStep,
        },
      });
    }

    // Validate required fields
    if (!aiAgentName || !agentDescription || !domainExpertise || !colorTheme) {
      return res.status(400).json({
        success: false,
        message: 'All required fields (aiAgentName, agentDescription, domainExpertise, colorTheme) must be provided',
      });
    }

    // Validate colorTheme format (basic hex color validation)
    const hexColorRegex = /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/;
    if (!hexColorRegex.test(colorTheme)) {
      return res.status(400).json({
        success: false,
        message: 'colorTheme must be a valid hex color code (e.g., #007bff)',
      });
    }

    // Validate uploaded files
    if (!req.files || !('logoFile' in req.files)) {
      return res.status(400).json({
        success: false,
        message: 'logoFile is required',
      });
    }

    // Since we're using upload.fields, req.files is guaranteed to be an object
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    if (!files['logoFile'] || files['logoFile'].length === 0) {
      return res.status(400).json({
        success: false,
        message: 'logoFile is required and must be a valid file',
      });
    }

    // Store relative paths for database
    const logoFile = path.join('Uploads/images', files['logoFile'][0].filename).replace(/\\/g, '/');
    const bannerFile = 'bannerFile' in files && files['bannerFile'].length > 0 ? path.join('Uploads/images', files['bannerFile'][0].filename).replace(/\\/g, '/') : null;

    // Log the file paths being stored
    console.log(`Storing logoFile path: ${logoFile}`);
    if (bannerFile) console.log(`Storing bannerFile path: ${bannerFile}`);

    // Generate a unique aiAgentSlug
    const generateSlug = (name: string): string => {
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const baseSlug = name.toLowerCase().replace(/\s+/g, '-');
      return `${baseSlug}_${randomNum}`;
    };

    let aiAgentSlug = generateSlug(aiAgentName);
    let slugExists = await aiAgentModel.findOne({ aiAgentSlug });

    // Ensure the slug is unique globally
    while (slugExists) {
      aiAgentSlug = generateSlug(aiAgentName);
      slugExists = await aiAgentModel.findOne({ aiAgentSlug });
    }

    // Create new AIAgent
    const newAIAgent = new aiAgentModel({
      aiAgentName,
      aiAgentSlug,
      agentDescription,
      domainExpertise,
      colorTheme,
      logoFile,
      bannerFile,
      userId: req.user.id,
      createdAt: new Date(),
      currentStep: 1,
    });

    // Save to database
    const savedAgent = await newAIAgent.save();

    return res.status(201).json({
      success: true,
      message: 'AIAgent created successfully - Step 1',
      data: {
        _id: savedAgent._id,
        aiAgentName: savedAgent.aiAgentName,
        aiAgentSlug: savedAgent.aiAgentSlug,
        agentDescription: savedAgent.agentDescription,
        domainExpertise: savedAgent.domainExpertise,
        colorTheme: savedAgent.colorTheme,
        logoFile: savedAgent.logoFile,
        bannerFile: savedAgent.bannerFile,
        userId: savedAgent.userId,
        createdAt: savedAgent.createdAt,
        currentStep: savedAgent.currentStep,
      },
    });
  } catch (error: unknown) {
    console.error('Error in createAIAgentStepOne:', error);
    if (error instanceof multer.MulterError) {
      console.error('Multer error details:', error.code, error.field);
      return res.status(400).json({
        success: false,
        message: `Multer error: ${error.message} (Code: ${error.code}, Field: ${error.field})`,
      });
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: errorMessage,
    });
  }
};

// Step 2: Update AIAgent with conversation-related fields
export const updateAIAgentStepTwo = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      greeting,
      tone,
      customRules,
      conversationStarters,
      languages,
      enableFreeText,
      enableBranchingLogic,
      conversationFlow,
    }: UpdateAIAgentStepTwoRequest = req.body;

    // Ensure user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'User must be authenticated',
      });
    }

    // Validate AIAgent ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid AIAgent ID',
      });
    }

    // Check if AIAgent exists, belongs to the user, and is at step 1
    const existingAgent = await aiAgentModel.findOne({ _id: id, userId: req.user.id });
    if (!existingAgent) {
      return res.status(404).json({
        success: false,
        message: 'AIAgent not found or you do not have permission to modify it',
      });
    }

    // Check if the agent is at the correct step
    if (existingAgent.currentStep !== 1) {
      return res.status(400).json({
        success: false,
        message: `Cannot update step 2: Agent is at step ${existingAgent.currentStep}`,
      });
    }

    // Validate tone if provided
    if (tone && !['formal', 'informal', 'friendly', 'professional'].includes(tone.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Tone must be one of: formal, informal, friendly, professional',
      });
    }

    // Validate conversationStarters if provided
    if (conversationStarters && (!Array.isArray(conversationStarters) || conversationStarters.some(s => typeof s !== 'string'))) {
      return res.status(400).json({
        success: false,
        message: 'conversationStarters must be an array of strings',
      });
    }

    // Process uploaded config file (optional)
    let configFile: string | null = null;
    if (req.files && 'configFile' in req.files && req.files['configFile'].length > 0) {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      configFile = path.join('Uploads/config', files['configFile'][0].filename).replace(/\\/g, '/');
      console.log(`Storing configFile path: ${configFile}`);
    }

    // Prepare update object with only provided fields
    const updateData: Partial<UpdateAIAgentStepTwoRequest> = {};
    if (greeting !== undefined) updateData.greeting = greeting;
    if (tone !== undefined) updateData.tone = tone;
    if (customRules !== undefined) updateData.customRules = customRules;
    if (conversationStarters !== undefined) updateData.conversationStarters = conversationStarters;
    if (languages !== undefined) updateData.languages = languages;
    if (enableFreeText !== undefined) updateData.enableFreeText = enableFreeText;
    if (enableBranchingLogic !== undefined) updateData.enableBranchingLogic = enableBranchingLogic;
    if (conversationFlow !== undefined) updateData.conversationFlow = conversationFlow;
    if (configFile !== null) updateData.configFile = configFile;

    // Update AIAgent
    const updatedAgent = await aiAgentModel.findOneAndUpdate(
      { _id: id, userId: req.user.id },
      {
        $set: {
          ...updateData,
          currentStep: 2,
        },
      },
      { new: true, runValidators: true }
    );

    if (!updatedAgent) {
      return res.status(404).json({
        success: false,
        message: 'Failed to update AIAgent',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'AIAgent updated successfully - Step 2',
      data: {
        _id: updatedAgent._id,
        aiAgentName: updatedAgent.aiAgentName,
        aiAgentSlug: updatedAgent.aiAgentSlug,
        greeting: updatedAgent.greeting,
        tone: updatedAgent.tone,
        customRules: updatedAgent.customRules,
        conversationStarters: updatedAgent.conversationStarters,
        languages: updatedAgent.languages,
        enableFreeText: updatedAgent.enableFreeText,
        enableBranchingLogic: updatedAgent.enableBranchingLogic,
        conversationFlow: updatedAgent.conversationFlow,
        configFile: updatedAgent.configFile,
        userId: updatedAgent.userId,
        currentStep: updatedAgent.currentStep,
      },
    });
  } catch (error: unknown) {
    console.error('Error in updateAIAgentStepTwo:', error);
    if (error instanceof multer.MulterError) {
      console.error('Multer error details:', error.code, error.field);
      return res.status(400).json({
        success: false,
        message: `Multer error: ${error.message} (Code: ${error.code}, Field: ${error.field})`,
      });
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: errorMessage,
    });
  }
};

// Step 3: Update AIAgent with data-related fields
export const updateAIAgentStepThree = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    let { manualEntry }: UpdateAIAgentStepThreeRequest = req.body;

    // Ensure user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'User must be authenticated',
      });
    }

    // Validate AIAgent ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid AIAgent ID',
      });
    }

    // Check if AIAgent exists, belongs to the user, and is at step 2
    const existingAgent = await aiAgentModel.findOne({ _id: id, userId: req.user.id });
    if (!existingAgent) {
      return res.status(404).json({
        success: false,
        message: 'AIAgent not found or you do not have permission to modify it',
      });
    }

    // Check if the agent is at the correct step
    if (existingAgent.currentStep !== 2) {
      return res.status(400).json({
        success: false,
        message: `Cannot update step 3: Agent is at step ${existingAgent.currentStep}`,
      });
    }

    // Parse manualEntry if provided as a JSON string
    if (manualEntry) {
      if (typeof manualEntry === 'string') {
        try {
          manualEntry = JSON.parse(manualEntry);
        } catch (error) {
          console.error('Error parsing manualEntry:', error);
          return res.status(400).json({
            success: false,
            message: 'manualEntry must be a valid JSON array',
          });
        }
      }

      // Validate manualEntry is an array
      if (!Array.isArray(manualEntry)) {
        return res.status(400).json({
          success: false,
          message: 'manualEntry must be an array',
        });
      }

      // Validate each entry in manualEntry
      for (const entry of manualEntry) {
        if (!entry.question || !entry.answer) {
          return res.status(400).json({
            success: false,
            message: 'Each manualEntry must have both question and answer fields',
          });
        }
        if (typeof entry.question !== 'string' || typeof entry.answer !== 'string') {
          return res.status(400).json({
            success: false,
            message: 'manualEntry question and answer must be strings',
          });
        }
      }
    }

    // Process uploaded files
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const csvFile = files && 'csvFile' in files && files['csvFile'].length > 0 ? path.join('Uploads/csv', files['csvFile'][0].filename).replace(/\\/g, '/') : null;
    const docFiles = files && 'docFiles' in files && files['docFiles'].length > 0 ? files['docFiles'].map(file => path.join('Uploads/docs', file.filename).replace(/\\/g, '/')) : [];

    // Log the file paths being stored
    if (csvFile) console.log(`Storing csvFile path: ${csvFile}`);
    if (docFiles.length > 0) console.log(`Storing docFiles paths: ${docFiles.join(', ')}`);

    // Prepare update object with only provided fields
    const updateData: Partial<UpdateAIAgentStepThreeRequest> = {};
    if (manualEntry !== undefined) {
      updateData.manualEntry = manualEntry.map(entry => ({
        ...entry,
        _id: new mongoose.Types.ObjectId(),
      }));
    }
    if (csvFile !== null) updateData.csvFile = csvFile;
    if (docFiles.length > 0) updateData.docFiles = docFiles;

    // Update AIAgent
    const updatedAgent = await aiAgentModel.findOneAndUpdate(
      { _id: id, userId: req.user.id },
      {
        $set: {
          ...updateData,
          currentStep: 3,
        },
      },
      { new: true, runValidators: true }
    );

    if (!updatedAgent) {
      return res.status(404).json({
        success: false,
        message: 'Failed to update AIAgent',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'AIAgent updated successfully - Step 3',
      data: {
        _id: updatedAgent._id,
        aiAgentName: updatedAgent.aiAgentName,
        aiAgentSlug: updatedAgent.aiAgentSlug,
        manualEntry: updatedAgent.manualEntry,
        csvFile: updatedAgent.csvFile,
        docFiles: updatedAgent.docFiles,
        userId: updatedAgent.userId,
        currentStep: updatedAgent.currentStep,
      },
    });
  } catch (error: unknown) {
    console.error('Error in updateAIAgentStepThree:', error);
    if (error instanceof multer.MulterError) {
      console.error('Multer error details:', error.code, error.field);
      return res.status(400).json({
        success: false,
        message: `Multer error: ${error.message} (Code: ${error.code}, Field: ${error.field})`,
      });
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: errorMessage,
    });
  }
};

// Get the user's AI agent
export const getUserAIAgent = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Ensure user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'User must be authenticated',
      });
    }

    // Fetch the user's AI agent
    const agent = await aiAgentModel.findOne({ userId: req.user.id }).select(
      '_id aiAgentName aiAgentSlug agentDescription domainExpertise colorTheme logoFile bannerFile createdAt currentStep greeting tone customRules conversationStarters languages enableFreeText enableBranchingLogic conversationFlow configFile manualEntry csvFile docFiles'
    );

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'No AI agent found for this user',
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

// Export Multer middleware for use in routes
export { uploadStepOne, uploadStepTwo, uploadStepThree };