import express from 'express';
import { createModule, getModulesByCourse, updateModule, deleteModule } from '../controllers/moduleController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/course/:courseId', getModulesByCourse);
router.post('/', authorizeRoles('teacher', 'admin'), createModule);
router.put('/:id', authorizeRoles('teacher', 'admin'), updateModule);
router.delete('/:id', authorizeRoles('teacher', 'admin'), deleteModule);

export default router;