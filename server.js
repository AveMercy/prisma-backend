import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './src/routes/authRoutes.js';
import groupRoutes from './src/routes/groupRoutes.js';
import courseRoutes from './src/routes/courseRoutes.js';
import moduleRoutes from './src/routes/moduleRoutes.js';
import lectureRoutes from './src/routes/lectureRoutes.js';
import assignmentRoutes from './src/routes/assignmentRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/modules', moduleRoutes);
app.use('/api/lectures', lectureRoutes);
app.use('/api/assignments', assignmentRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});