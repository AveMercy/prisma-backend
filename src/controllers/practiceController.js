import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Отправить практическую работу
export const submitPractice = async (req, res) => {
    try {
        const { lectureId, code, aiReview } = req.body;
        const studentId = req.user.id;

        // Проверяем, не сдавал ли уже
        const existing = await prisma.practiceSubmission.findFirst({
            where: { lectureId: parseInt(lectureId), studentId }
        });

        if (existing) {
            // Обновляем существующую
            const updated = await prisma.practiceSubmission.update({
                where: { id: existing.id },
                data: { code, aiReview, submittedAt: new Date() }
            });
            return res.json(updated);
        }

        const submission = await prisma.practiceSubmission.create({
            data: {
                lectureId: parseInt(lectureId),
                studentId,
                code,
                aiReview
            }
        });

        res.status(201).json(submission);
    } catch (error) {
        console.error('Ошибка отправки практической:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

// Получить свою сдачу по лекции
export const getMySubmission = async (req, res) => {
    try {
        const { lectureId } = req.params;
        const studentId = req.user.id;

        const submission = await prisma.practiceSubmission.findFirst({
            where: { lectureId: parseInt(lectureId), studentId }
        });

        res.json({ submission });
    } catch (error) {
        console.error('Ошибка получения сдачи:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

// Получить все сдачи по лекции (для препода)
export const getSubmissionsByLecture = async (req, res) => {
    try {
        const { lectureId } = req.params;

        const submissions = await prisma.practiceSubmission.findMany({
            where: { lectureId: parseInt(lectureId) },
            include: {
                student: { select: { id: true, fullName: true, email: true, avatarUrl: true } }
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

        const updated = await prisma.practiceSubmission.update({
            where: { id: parseInt(id) },
            data: { grade: parseInt(grade), feedback }
        });

        res.json(updated);
    } catch (error) {
        console.error('Ошибка оценки:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

// Получить все свои оценки (студент)
export const getMyGrades = async (req, res) => {
    try {
        const studentId = req.user.id;

        const submissions = await prisma.practiceSubmission.findMany({
            where: { studentId },
            include: {
                lecture: {
                    select: {
                        id: true,
                        title: true,
                        module: {
                            select: {
                                id: true,
                                title: true,
                                course: { select: { id: true, title: true } }
                            }
                        }
                    }
                }
            },
            orderBy: { submittedAt: 'desc' }
        });

        res.json({ submissions });
    } catch (error) {
        console.error('Ошибка получения оценок:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

export const getAllSubmissions = async (req, res) => {
    try {
        const submissions = await prisma.practiceSubmission.findMany({
            include: {
                student: { select: { id: true, fullName: true } },
            },
            orderBy: { submittedAt: 'desc' }
        });
        res.json({ submissions });
    } catch (error) {
        console.error('Ошибка getAllSubmissions:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};