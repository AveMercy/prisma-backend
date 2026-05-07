import express from 'express';
import { uploadFile, uploadMultipleFiles } from '../controllers/uploadController.js';
import { upload } from '../middleware/uploadMiddleware.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Загрузка одиночного файла (например, аватарки)
router.post('/single', authenticateToken, upload.single('file'), uploadFile);

// Загрузка нескольких файлов (например, вложения к лекции)
router.post('/multiple', authenticateToken, upload.array('files', 5), uploadMultipleFiles);

// Специализированные эндпоинты для удобства
router.post('/avatar', authenticateToken, upload.single('avatar'), uploadFile);
router.post('/banner', authenticateToken, upload.single('banner'), uploadFile);

export default router;