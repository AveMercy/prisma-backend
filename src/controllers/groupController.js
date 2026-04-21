import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Создание новой группы
export const createGroup = async (req, res) => {
    try {
        const { name, inviteCode } = req.body;

        // Простая генерация кода, если он не передан
        const finalInviteCode = inviteCode || Math.random().toString(36).substring(2, 8).toUpperCase();

        const group = await prisma.group.create({
            data: {
                name,
                inviteCode: finalInviteCode
            }
        });

        res.status(201).json(group);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Группа с таким названием или кодом уже существует.' });
        }
        console.error('Ошибка при создании группы:', error);
        res.status(500).json({ error: 'Ошибка сервера при создании группы.' });
    }
};

// Получение списка всех групп с количеством студентов
export const getAllGroups = async (req, res) => {
    try {
        const groups = await prisma.group.findMany({
            include: {
                _count: {
                    select: { users: true }
                }
            }
        });
        res.json(groups);
    } catch (error) {
        console.error('Ошибка при получении групп:', error);
        res.status(500).json({ error: 'Ошибка сервера.' });
    }
};

// Получение группы по ID с полным списком студентов
export const getGroupById = async (req, res) => {
    try {
        const { id } = req.params;
        const group = await prisma.group.findUnique({
            where: { id: parseInt(id) },
            include: {
                users: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        role: true
                    }
                }
            }
        });

        if (!group) {
            return res.status(404).json({ error: 'Группа не найдена.' });
        }

        res.json(group);
    } catch (error) {
        console.error('Ошибка при получении группы:', error);
        res.status(500).json({ error: 'Ошибка сервера.' });
    }
};

// Удаление группы
export const deleteGroup = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.group.delete({
            where: { id: parseInt(id) }
        });
        res.json({ message: 'Группа успешно удалена.' });
    } catch (error) {
        console.error('Ошибка при удалении группы:', error);
        res.status(500).json({ error: 'Ошибка сервера при удалении.' });
    }
};