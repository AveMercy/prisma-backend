import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

export const register = async (req, res) => {
    try {
        const { email, password, fullName, role, groupId } = req.body;

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'Пользователь с таким email уже существует.' });
        }

        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        const newUser = await prisma.user.create({
            data: {
                email,
                passwordHash,
                fullName,
                role: role || 'student',
                groupId: groupId ? parseInt(groupId) : null,
            },
        });

        res.status(201).json({ message: 'Пользователь успешно зарегистрирован', userId: newUser.id });
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        res.status(500).json({ error: 'Ошибка сервера при регистрации.' });
    }
};
export const getMe = async (req, res) => {
    try {
        // req.user.id должен подставиться из middleware protect после проверки JWT
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
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
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(401).json({ error: 'Неверный email или пароль.' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Неверный email или пароль.' });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role },  // было userId, стало id
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Вход выполнен успешно',
            token,
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Ошибка входа:', error);
        res.status(500).json({ error: 'Ошибка сервера при входе.' });
    }
};