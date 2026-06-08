import express from 'express';
import {
    createGroup,
    getTeacherGroups,
    getMyGroup,
    joinGroup,
    removeStudent,
    getGroupById
} from '../controllers/groupController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

// Студент: моя группа
router.get('/my', getMyGroup);
// Студент: присоединиться
router.post('/join', joinGroup);

// Преподаватель: группы
router.get('/teacher', authorizeRoles('teacher', 'admin'), getTeacherGroups);
router.post('/', authorizeRoles('teacher', 'admin'), createGroup);
router.get('/:id', authorizeRoles('teacher', 'admin'), getGroupById);
router.post('/remove-student', authorizeRoles('teacher', 'admin'), removeStudent);

export default router;