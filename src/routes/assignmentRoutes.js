import express from 'express';
import { createAssignment, getAssignmentsByLecture } from '../controllers/assignmentController.js';
import {
    submitWork,
    gradeSubmission,
    getSubmissionsByAssignment
} from '../controllers/submissionController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

// Работа с заданиями
router.get('/lecture/:lectureId', getAssignmentsByLecture);
router.post('/', authorizeRoles('teacher', 'admin'), createAssignment);

// Работа со сдачами
router.post('/submit', authorizeRoles('student'), submitWork);
router.get('/submissions/:assignmentId', authorizeRoles('teacher', 'admin'), getSubmissionsByAssignment);
router.put('/grade/:id', authorizeRoles('teacher', 'admin'), gradeSubmission);

export default router;