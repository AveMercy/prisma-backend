import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { checkAchievements } from '../utils/achievements.js';

// Добавить или обновить реакцию
export const setReaction = async (req, res) => {
    try {
        const { lectureId, reactionType } = req.body;
        const userId = req.user.id;

        const existing = await prisma.reaction.findFirst({
            where: { userId, lectureId: parseInt(lectureId) }
        });

        if (existing) {
            if (existing.reactionType === reactionType) {
                await prisma.reaction.delete({ where: { id: existing.id } });
                return res.json({ message: 'Реакция удалена' });
            }
            const updated = await prisma.reaction.update({
                where: { id: existing.id },
                data: { reactionType }
            });
            return res.json(updated);

        }
        await checkAchievements(userId);

        const reaction = await prisma.reaction.create({
            data: {
                userId,
                lectureId: parseInt(lectureId),
                reactionType
            }
        });
        res.status(201).json(reaction);
    } catch (error) {
        console.error('Ошибка реакции:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

// Получить реакции на лекцию
export const getReactions = async (req, res) => {
    try {
        const { lectureId } = req.params;

        const reactions = await prisma.reaction.groupBy({
            by: ['reactionType'],
            where: { lectureId: parseInt(lectureId) },
            _count: true
        });

        const result = {
            '👍': 0,
            '🤯': 0,
            '💤': 0,
        };

        reactions.forEach(r => {
            result[r.reactionType] = r._count;
        });

        res.json(result);
    } catch (error) {
        console.error('Ошибка получения реакций:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

// Получить реакцию текущего пользователя на лекцию
export const getMyReaction = async (req, res) => {
    try {
        const { lectureId } = req.params;
        const userId = req.user.id;

        const reaction = await prisma.reaction.findFirst({
            where: { userId, lectureId: parseInt(lectureId) }
        });

        res.json({ reactionType: reaction?.reactionType || null });
    } catch (error) {
        console.error('Ошибка получения реакции:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};