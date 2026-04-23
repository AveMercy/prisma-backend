import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Добавить или убрать реакцию
export const addReaction = async (req, res) => {
    try {
        const { lectureId, reactionType } = req.body;
        const userId = req.user.userId;

        // Проверяем, ставил ли пользователь уже ТАКУЮ ЖЕ реакцию
        const existingReaction = await prisma.reaction.findFirst({
            where: {
                userId: userId,
                lectureId: parseInt(lectureId),
                reactionType: reactionType
            }
        });

        if (existingReaction) {
            // Если ставил — удаляем (эффект "toggle / снять лайк")
            await prisma.reaction.delete({ where: { id: existingReaction.id } });
            return res.json({ message: 'Реакция удалена' });
        }

        // Если не ставил — создаем
        const reaction = await prisma.reaction.create({
            data: {
                userId: userId,
                lectureId: parseInt(lectureId),
                reactionType: reactionType
            }
        });

        res.status(201).json(reaction);
    } catch (error) {
        console.error('Ошибка добавления реакции:', error);
        res.status(500).json({ error: 'Ошибка сервера.' });
    }
};

// Получить сводку реакций по лекции (для отображения под видео/текстом)
export const getLectureReactions = async (req, res) => {
    try {
        const { lectureId } = req.params;

        // Группируем реакции по типу и считаем их количество
        const reactionsGrouped = await prisma.reaction.groupBy({
            by: ['reactionType'],
            where: { lectureId: parseInt(lectureId) },
            _count: {
                reactionType: true
            }
        });

        // Превращаем массив в удобный объект: { "👍": 5, "❓": 2 }
        const summary = reactionsGrouped.reduce((acc, curr) => {
            acc[curr.reactionType] = curr._count.reactionType;
            return acc;
        }, {});

        res.json(summary);
    } catch (error) {
        console.error('Ошибка получения реакций:', error);
        res.status(500).json({ error: 'Ошибка сервера.' });
    }
};