import express from 'express';
import { addReaction, getLectureReactions } from '../controllers/reactionController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Просмотр сводки реакций доступен всем (даже без токена, если нужно, но пока защитим)
router.get('/lecture/:lectureId', authenticateToken, getLectureReactions);

// Ставить реакции могут только авторизованные студенты/пользователи
router.post('/', authenticateToken, addReaction);

export default router;