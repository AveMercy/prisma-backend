import express from 'express';
import { register, login } from '../controllers/authController.js';
import { getMe } from '../controllers/authController.js';
import { authenticateToken as protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Публичные роуты
router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);

export default router;