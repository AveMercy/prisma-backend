import express from 'express';
import {
    getAllCourses,
    createCourse,
    getCourseById,
    updateCourse,
    deleteCourse,
    getMyCourses
} from '../controllers/courseController.js';

import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// Публичные роуты (но всё равно требуем логин для статистики/доступа)
router.get('/', authenticateToken, getAllCourses);
router.get('/:id', authenticateToken, getCourseById);

// Роуты управления контентом (только учитель или админ)
router.post('/', authenticateToken, authorizeRoles('teacher', 'admin'), createCourse);
router.put('/:id', authenticateToken, authorizeRoles('teacher', 'admin'), updateCourse);
router.delete('/:id', authenticateToken, authorizeRoles('teacher', 'admin'), deleteCourse);

router.get('/my', authenticateToken, getMyCourses);

export default router;