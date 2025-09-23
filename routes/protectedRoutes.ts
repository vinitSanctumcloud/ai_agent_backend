// routes/protectedRoutes.js
import { Router } from 'express';
import authMiddleware from '../middlewares/authMiddleware';
import { createAIAgentStepOne, updateAIAgentStepTwo, getUserAIAgent, uploadStepOne, uploadStepTwo, uploadStepThree, updateAIAgentStepThree } from '../controllers/aiAgentController';
import { checkAuth } from '../controllers/authController';

const router = Router();

// Apply authMiddleware to all routes
router.use(authMiddleware);

// Routes for AI agent creation and updates
router.post('/ai-agents/step1', uploadStepOne, createAIAgentStepOne);
router.put('/ai-agents/step2/:id', uploadStepTwo, updateAIAgentStepTwo); // Updated with uploadStepTwo
router.put('/ai-agents/step3/:id', uploadStepThree, updateAIAgentStepThree);
router.get('/ai-agents', getUserAIAgent);
router.get('/me', checkAuth);

export default router;