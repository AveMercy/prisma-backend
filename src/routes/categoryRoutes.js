import express from 'express';
import { getAllCategories, createCategory, deleteCategory } from '../controllers/categoryController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', getAllCategories);
router.post('/', authorizeRoles('teacher', 'admin'), createCategory);
router.delete('/:id', authorizeRoles('teacher', 'admin'), deleteCategory);

export default router;