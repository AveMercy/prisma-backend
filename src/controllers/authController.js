import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

export const register = async (req, res) => {
    try {
        const { email, password, fullName, role, inviteCode } = req.body;

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'Пользователь с таким email уже существует.' });
        }

        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        // Если есть inviteCode — найти группу
        let groupId = null;
        if (inviteCode) {
            const group = await prisma.group.findUnique({ where: { inviteCode } });
            if (group) {
                groupId = group.id;
            } else {
                return res.status(400).json({ error: 'Группа с таким кодом не найдена.' });
            }
        }

        const newUser = await prisma.user.create({
            data: {
                email,
                passwordHash,
                fullName,
                role: role || 'student',
                groupId,
            },
            select: {
                id: true,
                email: true,
                fullName: true,
                role: true,
                avatarUrl: true,
                settings: true,
                groupId: true,
            }
        });

        const token = jwt.sign(
            { id: newUser.id, role: newUser.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            message: 'Пользователь успешно зарегистрирован',
            token,
            user: newUser
        });
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        res.status(500).json({ error: 'Ошибка сервера при регистрации.' });
    }
};
export const getMe = async (req, res) => {
    try {
        // В JWT у тебя { id: user.id, role: user.role }
        const userId = req.user.id;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                fullName: true,
                role: true,
                avatarUrl: true,
                settings: true,
                groupId: true,
            },
        });

        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        res.json({ user });
    } catch (error) {
        console.error('Ошибка getMe:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                email: true,
                fullName: true,
                role: true,
                avatarUrl: true,
                settings: true,
                groupId: true,
                passwordHash: true // нужно для проверки пароля
            }
        });

        if (!user) {
            return res.status(401).json({ error: 'Неверный email или пароль.' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Неверный email или пароль.' });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Убираем passwordHash из ответа
        const { passwordHash, ...safeUser } = user;

        res.json({
            message: 'Вход выполнен успешно',
            token,
            user: safeUser
        });
    } catch (error) {
        console.error('Ошибка входа:', error);
        res.status(500).json({ error: 'Ошибка сервера при входе.' });
    }
};