import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Получение профиля текущего пользователя
export const getProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true, email: true, fullName: true, role: true,
                avatarUrl: true, settings: true, createdAt: true,
                birthDate: true, bio: true, phone: true,
                telegram: true, github: true, githubToken: true, website: true,
                Group: { select: { id: true, name: true } },
            }
        });

        if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
        res.json(user);
    } catch (error) {
        console.error('Ошибка получения профиля:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { fullName, avatarUrl, settings, birthDate, bio, phone, telegram, github, website, githubToken } = req.body;

        const updated = await prisma.user.update({
            where: { id: userId },
            data: {
                ...(fullName !== undefined && { fullName }),
                ...(avatarUrl !== undefined && { avatarUrl }),
                ...(settings !== undefined && { settings }),
                ...(birthDate !== undefined && { birthDate: birthDate ? new Date(birthDate) : null }),
                ...(bio !== undefined && { bio }),
                ...(phone !== undefined && { phone }),
                ...(telegram !== undefined && { telegram }),
                ...(github !== undefined && { github }),
                ...(githubToken !== undefined && { githubToken }),
                ...(website !== undefined && { website }),
            }
        });

        res.json({ message: 'Профиль обновлён', user: updated });
    } catch (error) {
        console.error('Ошибка обновления профиля:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

// Смена пароля
export const changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;

        const user = await prisma.user.findUnique({ where: { id: userId } });

        const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isValid) {
            return res.status(400).json({ error: 'Неверный текущий пароль' });
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: userId },
            data: { passwordHash }
        });

        res.json({ message: 'Пароль успешно изменён' });
    } catch (error) {
        console.error('Ошибка смены пароля:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};
// Публичный профиль пользователя по ID
export const getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await prisma.user.findUnique({
            where: { id: parseInt(id) },
            select: {
                id: true, fullName: true, role: true, avatarUrl: true,
                bio: true, telegram: true, github: true, website: true,
                createdAt: true,
                Group: { select: { id: true, name: true } },
            }
        });

        if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
        res.json({ user });
    } catch (error) {
        console.error('Ошибка получения пользователя:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};