import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './src/routes/authRoutes.js';
import groupRoutes from './src/routes/groupRoutes.js';
import courseRoutes from './src/routes/courseRoutes.js';
import moduleRoutes from './src/routes/moduleRoutes.js';
import lectureRoutes from './src/routes/lectureRoutes.js';
import assignmentRoutes from './src/routes/assignmentRoutes.js';
import progressRoutes from './src/routes/progressRoutes.js';
import reactionRoutes from './src/routes/reactionRoutes.js';
import categoryRoutes from './src/routes/categoryRoutes.js';
import tagRoutes from './src/routes/tagRoutes.js';
import achievementRoutes from './src/routes/achievementRoutes.js';
import userRoutes from './src/routes/userRoutes.js';
import uploadRoutes from './src/routes/uploadRoutes.js';
import aiRoutes from './src/routes/aiRoutes.js';
import practiceRoutes from './src/routes/practiceRoutes.js';
import githubRoutes from './src/routes/githubRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

app.use(cors({
    origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        if (allowedOrigins.includes(origin)) return cb(null, true);
        cb(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

app.use('/api/ai', aiRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/modules', moduleRoutes);
app.use('/api/lectures', lectureRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/reactions', reactionRoutes);
app.use('/api/category', categoryRoutes);
app.use('/api/tag', tagRoutes);
app.use('/api/achievement', achievementRoutes);
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/practice', practiceRoutes);
app.use('/api/github', githubRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});