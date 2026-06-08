import { PrismaClient } from '@prisma/client';
import { checkAchievements } from '../utils/achievements.js';

const prisma = new PrismaClient();

// Сдать задание (с файлом)
export const submitWork = async (req, res) => {
    try {
        const { assignmentId, comment } = req.body;
        const studentId = req.user.id;
        let fileUrl = null;

        if (req.file) {
            fileUrl = `/uploads/${req.file.filename}`;
        }

        const existing = await prisma.submission.findFirst({
            where: { assignmentId: parseInt(assignmentId), studentId }
        });

        if (existing) {
            const updated = await prisma.submission.update({
                where: { id: existing.id },
                data: {
                    solutionUrl: fileUrl || existing.solutionUrl,
                    feedback: comment || existing.feedback,
                    submittedAt: new Date()
                }
            });
            return res.json(updated);
        }

        const submission = await prisma.submission.create({
            data: {
                assignmentId: parseInt(assignmentId),
                studentId,
                solutionUrl: fileUrl,
                feedback: comment,
            }
        });

        try { await checkAchievements(studentId); } catch (e) { console.error('Achievement error:', e); }
        res.status(201).json(submission);
    } catch (error) {
        console.error('Ошибка сдачи:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

// Получить все сдачи по заданию (для препода)
export const getSubmissionsByAssignment = async (req, res) => {
    try {
        const { assignmentId } = req.params;

        const submissions = await prisma.submission.findMany({
            where: { assignmentId: parseInt(assignmentId) },
            include: {
                student: { select: { id: true, fullName: true, email: true } }
            },
            orderBy: { submittedAt: 'desc' }
        });

        res.json({ submissions });
    } catch (error) {
        console.error('Ошибка получения сдач:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

// Выставить оценку (преподаватель)
export const gradeSubmission = async (req, res) => {
    try {
        const { id } = req.params;
        const { grade, feedback } = req.body;

        if (grade && ![2, 3, 4, 5].includes(grade)) {
            return res.status(400).json({ error: 'Оценка должна быть от 2 до 5' });
        }

        const updated = await prisma.submission.update({
            where: { id: parseInt(id) },
            data: {
                grade: parseInt(grade),
                feedback: feedback || undefined
            }
        });

        if (grade === 5) {
            try { await checkAchievements(updated.studentId); } catch (e) {}
        }

        res.json(updated);
    } catch (error) {
        console.error('Ошибка оценки:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};