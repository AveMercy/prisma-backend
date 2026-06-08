import express from 'express';
import {
    submitPractice,
    getMySubmission,
    getSubmissionsByLecture,
    gradeSubmission,
    getMyGrades,
    getAllSubmissions,
} from '../controllers/practiceController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

// Студент
router.post('/submit', submitPractice);
router.get('/my/:lectureId', getMySubmission);
router.get('/my-grades', getMyGrades);
router.get('/submissions/all', authorizeRoles('teacher', 'admin'), getAllSubmissions);

// Преподаватель
router.get('/submissions/:lectureId', authorizeRoles('teacher', 'admin'), getSubmissionsByLecture);
router.put('/grade/:id', authorizeRoles('teacher', 'admin'), gradeSubmission);

export default router;