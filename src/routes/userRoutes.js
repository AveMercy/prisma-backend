import express from 'express';
import { getProfile, updateProfile, changePassword, getUserById } from '../controllers/userController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/profile', getProfile);
router.get('/:id', authenticateToken, getUserById);

router.put('/profile', updateProfile);
router.put('/password', changePassword);


export default router;