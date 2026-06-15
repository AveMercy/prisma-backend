import express from 'express';
import {
    getAllCourses,
    createCourse,
    getCourseById,
    updateCourse,
    deleteCourse,
    getMyCourses,
    enrollCourse,
    unenrollCourse,
    updateCourseStatus
} from '../controllers/courseController.js';

import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();
// Публичные роуты
router.get('/', authenticateToken, getAllCourses);
router.get('/my', authenticateToken, getMyCourses);

router.post('/enroll', authenticateToken, enrollCourse);
router.post('/unenroll', authenticateToken, unenrollCourse);
router.put('/status', authenticateToken, updateCourseStatus);

router.get('/:id', authenticateToken, getCourseById);

// Роуты управления контентом
router.post('/', authenticateToken, authorizeRoles('teacher', 'admin'), createCourse);
router.put('/:id', authenticateToken, authorizeRoles('teacher', 'admin'), updateCourse);
router.delete('/:id', authenticateToken, authorizeRoles('teacher', 'admin'), deleteCourse);

export default router;