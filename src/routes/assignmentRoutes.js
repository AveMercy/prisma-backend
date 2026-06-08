import express from 'express';
import multer from 'multer';
import path from 'path';
import { createAssignment, getAssignmentsByLecture, getMyAssignments, getTeacherAssignments } from '../controllers/assignmentController.js';
import { submitWork, getSubmissionsByAssignment, gradeSubmission } from '../controllers/submissionController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname);
        cb(null, uniqueName);
    },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.use(authenticateToken);

// Задания
router.get('/my', getMyAssignments);
router.get('/teacher', authorizeRoles('teacher', 'admin'), getTeacherAssignments);
router.get('/lecture/:lectureId', getAssignmentsByLecture);
router.post('/', authorizeRoles('teacher', 'admin'), createAssignment);

// Сдача
router.post('/submit', upload.single('file'), submitWork);
router.get('/submissions/:assignmentId', authorizeRoles('teacher', 'admin'), getSubmissionsByAssignment);
router.put('/grade/:id', authorizeRoles('teacher', 'admin'), gradeSubmission);

export default router;