import express from 'express';
import {
    createGroup,
    getAllGroups,
    getGroupById,
    deleteGroup
} from '../controllers/groupController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// Все роуты групп требуют авторизации
router.use(authenticateToken);

// Просмотр доступен всем авторизованным
router.get('/', getAllGroups);
router.get('/:id', getGroupById);

// Создание и удаление — только для учителей и админов
router.post('/', authorizeRoles('teacher', 'admin'), createGroup);
router.delete('/:id', authorizeRoles('teacher', 'admin'), deleteGroup);

export default router;