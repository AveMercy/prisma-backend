import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Сдать работу (для студента)
export const submitWork = async (req, res) => {
    try {
        const { assignmentId, solutionUrl } = req.body;
        const studentId = req.user.userId;

        const submission = await prisma.submission.upsert({
            where: {
                // Предполагаем уникальность пары студент-задание для пересдачи
                id: (await prisma.submission.findFirst({
                    where: { assignmentId: parseInt(assignmentId), studentId }
                }))?.id || -1
            },
            update: {
                solutionUrl,
                submittedAt: new Date(),
                grade: null, // Сбрасываем оценку при обновлении работы
                feedback: null
            },
            create: {
                assignmentId: parseInt(assignmentId),
                studentId,
                solutionUrl
            }
        });

        res.status(201).json(submission);
    } catch (error) {
        console.error('Ошибка сдачи работы:', error);
        res.status(500).json({ error: 'Ошибка сервера при отправке работы.' });
    }
};

// Выставить оценку (для преподавателя)
export const gradeSubmission = async (req, res) => {
    try {
        const { id } = req.params;
        const { grade, feedback } = req.body;

        const updated = await prisma.submission.update({
            where: { id: parseInt(id) },
            data: {
                grade: parseInt(grade),
                feedback
            }
        });

        res.json(updated);
    } catch (error) {
        console.error('Ошибка при оценке:', error);
        res.status(500).json({ error: 'Ошибка сервера при выставлении оценки.' });
    }
};

// Получить все сданные работы по заданию (для учителя)
export const getSubmissionsByAssignment = async (req, res) => {
    try {
        const { assignmentId } = req.params;
        const submissions = await prisma.submission.findMany({
            where: { assignmentId: parseInt(assignmentId) },
            include: {
                student: {
                    select: { id: true, fullName: true, email: true }
                }
            }
        });
        res.json(submissions);
    } catch (error) {
        console.error('Ошибка получения работ:', error);
        res.status(500).json({ error: 'Ошибка сервера.' });
    }
};