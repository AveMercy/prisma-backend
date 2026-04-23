import express from 'express';
import { getAllTags, createTag, deleteTag } from '../controllers/tagController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', getAllTags);
router.post('/', authorizeRoles('teacher', 'admin'), createTag);
router.delete('/:id', authorizeRoles('teacher', 'admin'), deleteTag);

export default router;