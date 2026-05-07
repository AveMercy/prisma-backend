import express from 'express';
import {
    getAllAchievements,
    getUserAchievements,
    createAchievement,
    awardAchievement
} from '../controllers/achievementController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

// Просмотр достижений (доступно всем авторизованным)
router.get('/', getAllAchievements);
// 1. Для получения ачивок текущего пользователя (из токена)
router.get('/user', getUserAchievements);

// 2. Для получения ачивок конкретного пользователя по ID
router.get('/user/:userId', getUserAchievements);

// Управление достижениями (только для админов или учителей)
router.post('/', authorizeRoles('admin'), createAchievement);
router.post('/award', authorizeRoles('teacher', 'admin'), awardAchievement);

export default router;