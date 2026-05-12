import express from 'express';
import { toggleLectureProgress, getCourseProgress, getMyProgress } from '../controllers/progressController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

router.post('/toggle', toggleLectureProgress);
router.get('/course/:courseId', getCourseProgress);
router.get('/my', getMyProgress); // НОВЫЙ

export default router;