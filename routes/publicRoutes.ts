// routes/publicRoutes.js
import { Router } from 'express';
import {  getUserAIAgent, login, signup } from '../controllers/authController';
import { get } from 'http';

const router = Router();

router.post('/login', login);
router.post('/signup', signup);
router.get('/ai-agents/:aiAgentSlug', getUserAIAgent);


export default router;