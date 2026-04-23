import express from 'express';
import { toggleLectureProgress, getCourseProgress } from '../controllers/progressController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken); // Доступ только для авторизованных

router.post('/toggle', toggleLectureProgress);
router.get('/course/:courseId', getCourseProgress);

export default router;