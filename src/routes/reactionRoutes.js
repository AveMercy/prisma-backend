import express from 'express';
import { setReaction, getReactions, getMyReaction } from '../controllers/reactionController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

router.post('/', setReaction);
router.get('/:lectureId', getReactions);
router.get('/my/:lectureId', getMyReaction);

export default router;