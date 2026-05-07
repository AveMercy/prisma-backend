import express from 'express';
import { getProfile, updateProfile } from '../controllers/userController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Все роуты профиля требуют авторизации
router.use(authenticateToken);

// Получить свой профиль
router.get('/profile', getProfile);

// Обновить свой профиль (включая отправку URL загруженной аватарки)
router.put('/profile', updateProfile);

export default router;