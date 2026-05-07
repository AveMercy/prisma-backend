import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Получение профиля текущего пользователя
export const getProfile = async (req, res) => {
    try {
        const userId = req.user.userId;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                fullName: true,
                role: true,
                avatarUrl: true,
                settings: true,
                createdAt: true,
                group: {
                    select: { id: true, name: true }
                },
                achievements: {
                    include: {
                        achievement: true
                    }
                }
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден.' });
        }

        res.json(user);
    } catch (error) {
        console.error('Ошибка при получении профиля:', error);
        res.status(500).json({ error: 'Ошибка сервера при получении профиля.' });
    }
};

// Обновление данных профиля (включая аватарку)
export const updateProfile = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { fullName, avatarUrl, settings } = req.body;

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                ...(fullName && { fullName }),
                ...(avatarUrl && { avatarUrl }),
                // Если переданы настройки, мержим их (Prisma ожидает валидный JSON)
                ...(settings && { settings })
            },
            select: {
                id: true,
                email: true,
                fullName: true,
                role: true,
                avatarUrl: true,
                settings: true
            }
        });

        res.json({ message: 'Профиль успешно обновлен', user: updatedUser });
    } catch (error) {
        console.error('Ошибка при обновлении профиля:', error);
        res.status(500).json({ error: 'Ошибка сервера при обновлении профиля.' });
    }
};