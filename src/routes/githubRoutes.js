import express from 'express';
import { pushToGithub, getRepos } from '../controllers/githubController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(authenticateToken);
router.post('/push', pushToGithub);
router.get('/repos', getRepos);

export default router;