import express from 'express';
import { createLecture, getLectureById, updateLecture, deleteLecture } from '../controllers/lectureController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/:id', getLectureById);
router.post('/', authorizeRoles('teacher', 'admin'), createLecture);
router.put('/:id', authorizeRoles('teacher', 'admin'), updateLecture);
router.delete('/:id', authorizeRoles('teacher', 'admin'), deleteLecture);

export default router;