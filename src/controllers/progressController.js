import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Отметить лекцию как пройденную (или снять отметку)
export const toggleLectureProgress = async (req, res) => {
    try {
        const { lectureId, isCompleted } = req.body;
        const userId = req.user.userId;

        // Используем upsert: обновляем, если запись есть, или создаем новую
        const progress = await prisma.userProgress.upsert({
            where: {
                // Композитный ключ из схемы: @@id([userId, lectureId])
                userId_lectureId: {
                    userId: userId,
                    lectureId: parseInt(lectureId)
                }
            },
            update: {
                isCompleted: isCompleted !== undefined ? isCompleted : true,
                completedAt: new Date()
            },
            create: {
                userId: userId,
                lectureId: parseInt(lectureId),
                isCompleted: isCompleted !== undefined ? isCompleted : true
            }
        });

        res.status(200).json(progress);
    } catch (error) {
        console.error('Ошибка сохранения прогресса:', error);
        res.status(500).json({ error: 'Ошибка сервера при сохранении прогресса.' });
    }
};

// Получить прогресс студента по конкретному курсу (в процентах)
export const getCourseProgress = async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.user.userId;

        // 1. Находим все лекции в этом курсе
        const courseLectures = await prisma.lecture.findMany({
            where: { module: { courseId: parseInt(courseId) } },
            select: { id: true }
        });

        const totalLectures = courseLectures.length;
        if (totalLectures === 0) {
            return res.json({ progressPercentage: 0, completed: 0, total: 0 });
        }

        const lectureIds = courseLectures.map(l => l.id);

        // 2. Считаем, сколько из них пройдено пользователем
        const completedCount = await prisma.userProgress.count({
            where: {
                userId: userId,
                lectureId: { in: lectureIds },
                isCompleted: true
            }
        });

        const progressPercentage = Math.round((completedCount / totalLectures) * 100);

        res.json({
            progressPercentage,
            completed: completedCount,
            total: totalLectures
        });
    } catch (error) {
        console.error('Ошибка расчета прогресса:', error);
        res.status(500).json({ error: 'Ошибка сервера при расчете прогресса.' });
    }
};