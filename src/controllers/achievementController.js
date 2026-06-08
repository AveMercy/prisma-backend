import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Получить список всех существующих достижений в системе
export const getAllAchievements = async (req, res) => {
    try {
        const achievements = await prisma.achievement.findMany();
        res.json(achievements);
    } catch (error) {
        console.error('Ошибка при получении списка достижений:', error);
        res.status(500).json({ error: 'Ошибка сервера.' });
    }
};

// Получить достижения конкретного пользователя
export const getUserAchievements = async (req, res) => {
    try {
        const userId = parseInt(req.params.userId) || req.user.userId;

        const userAchievements = await prisma.userAchievement.findMany({
            where: { userId },
            include: {
                achievement: true
            },
            orderBy: { earnedAt: 'desc' }
        });

        res.json(userAchievements);
    } catch (error) {
        console.error('Ошибка при получении достижений пользователя:', error);
        res.status(500).json({ error: 'Ошибка сервера.' });
    }
};

// Создать новое достижение (только для админов)
export const createAchievement = async (req, res) => {
    try {
        const { name, description, iconUrl, requirementCode } = req.body;

        const achievement = await prisma.achievement.create({
            data: {
                name,
                description,
                iconUrl,
                requirementCode // Строковый код (например, 'FIRST_LECTURE_COMPLETED')
            }
        });

        res.status(201).json(achievement);
    } catch (error) {
        console.error('Ошибка при создании достижения:', error);
        res.status(500).json({ error: 'Ошибка сервера.' });
    }
}

// Вручить достижение пользователю (ручное или триггерное)
export const awardAchievement = async (req, res) => {
    try {
        const { userId, achievementId } = req.body;

        const record = await prisma.userAchievement.create({
            data: {
                userId: parseInt(userId),
                achievementId: parseInt(achievementId)
            }
        });

        res.status(201).json({ message: 'Достижение успешно разблокировано!', record });
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'У пользователя уже есть это достижение.' });
        }
        console.error('Ошибка при вручении достижения:', error);
        res.status(500).json({ error: 'Ошибка сервера.' });
    }
};

export const getNewAchievements = async (req, res) => {
    try {
        const userId = req.user.id;

        const achievements = await prisma.userAchievement.findMany({
            where: { userId },
            include: { achievement: true },
            orderBy: { earnedAt: 'desc' },
            take: 5
        });

        res.json({ achievements });
    } catch (error) {
        console.error('Ошибка получения новых ачивок:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};