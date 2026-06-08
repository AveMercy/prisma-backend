import { PrismaClient } from '@prisma/client';
import { checkAchievements } from '../utils/achievements.js';

const prisma = new PrismaClient();

export const toggleLectureProgress = async (req, res) => {
    try {
        const { lectureId, isCompleted } = req.body;
        const userId = req.user.id;

        const progress = await prisma.userProgress.upsert({
            where: {
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
        try { await checkAchievements(userId); } catch (e) { console.error('Achievement error:', e); }
    } catch (error) {
        console.error('Ошибка сохранения прогресса:', error);
        res.status(500).json({ error: 'Ошибка сервера при сохранении прогресса.' });
    }
};

export const getCourseProgress = async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.user.id;

        const courseLectures = await prisma.lecture.findMany({
            where: { module: { courseId: parseInt(courseId) } },
            select: { id: true }
        });

        const totalLectures = courseLectures.length;
        if (totalLectures === 0) {
            return res.json({ progressPercentage: 0, completed: 0, total: 0 });
        }

        const lectureIds = courseLectures.map(l => l.id);

        const completedCount = await prisma.userProgress.count({
            where: {
                userId: userId,
                lectureId: { in: lectureIds },
                isCompleted: true
            }
        });

        const progressPercentage = Math.round((completedCount / totalLectures) * 100);

        res.json({ progressPercentage, completed: completedCount, total: totalLectures });
    } catch (error) {
        console.error('Ошибка расчета прогресса:', error);
        res.status(500).json({ error: 'Ошибка сервера при расчете прогресса.' });
    }
};

export const getMyProgress = async (req, res) => {
    try {
        const userId = req.user.id;

        const progress = await prisma.userProgress.findMany({
            where: { userId },
            include: {
                lecture: {
                    include: {
                        module: {
                            include: { course: true }
                        }
                    }
                }
            }
        });

        res.json({ progress });
    } catch (error) {
        console.error('Ошибка получения прогресса:', error);
        res.status(500).json({ error: 'Ошибка сервера.' });
    }
};