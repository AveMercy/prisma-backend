import express from 'express';
import { askAI, generateLecture, reviewCode, submitCodeReview, generateTest  } from '../controllers/aiController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/ask', authenticateToken, askAI);
router.post('/generate', authenticateToken, authorizeRoles('teacher', 'admin'), generateLecture);
router.post('/review-code', authenticateToken, reviewCode);
router.post('/submit-review', authenticateToken, submitCodeReview);
router.post('/generate-test', authenticateToken, authorizeRoles('teacher', 'admin'), generateTest);

export default router;