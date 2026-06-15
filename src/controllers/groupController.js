import { PrismaClient, Prisma } from '@prisma/client';
const prisma = new PrismaClient();

// Создать группу (преподаватель)
export const createGroup = async (req, res) => {
    try {
        const { name } = req.body;

        const existing = await prisma.group.findUnique({ where: { name } });
        if (existing) {
            return res.status(400).json({ error: 'Группа с таким названием уже существует' });
        }

        const inviteCode = name.toLowerCase().replace(/\s+/g, '-') + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();

        const group = await prisma.group.create({
            data: { name, inviteCode }
        });

        res.status(201).json(group);
    } catch (error) {
        console.error('Ошибка создания группы:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

// Получить группы преподавателя
export const getTeacherGroups = async (req, res) => {
    try {
        const teacherId = req.user.id;

        const teacher = await prisma.user.findUnique({
            where: { id: teacherId },
            select: { groupId: true }
        });

        // Все группы (препод видит все группы)
        const groups = await prisma.group.findMany({
            include: {
                users: {
                    select: { id: true, fullName: true, email: true, role: true, avatarUrl: true },
                    orderBy: { fullName: 'asc' }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ groups });
    } catch (error) {
        console.error('Ошибка получения групп:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

// Получить группу студента
export const getMyGroup = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { groupId: true }
        });

        if (!user?.groupId) {
            return res.json({ group: null });
        }

        const group = await prisma.group.findUnique({
            where: { id: user.groupId },
            include: {
                users: {
                    select: { id: true, fullName: true, email: true, role: true, avatarUrl: true }
                }
            }
        });

        res.json({ group });
    } catch (error) {
        console.error('Ошибка получения группы:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

// Присоединиться к группе по коду
export const joinGroup = async (req, res) => {
    try {
        const { inviteCode } = req.body;
        const userId = req.user.id;

        const group = await prisma.group.findUnique({ where: { inviteCode } });
        if (!group) {
            return res.status(404).json({ error: 'Группа с таким кодом не найдена' });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user.groupId) {
            return res.status(400).json({ error: 'Вы уже состоите в группе' });
        }

        await prisma.user.update({
            where: { id: userId },
            data: { groupId: group.id }
        });

        res.json({ message: 'Вы присоединились к группе', group });
    } catch (error) {
        console.error('Ошибка присоединения к группе:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

// Удалить студента из группы (преподаватель)
export const removeStudent = async (req, res) => {
    try {
        const { groupId, studentId } = req.body;

        await prisma.user.update({
            where: { id: parseInt(studentId) },
            data: { groupId: null }
        });

        res.json({ message: 'Студент удалён из группы' });
    } catch (error) {
        console.error('Ошибка удаления студента:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

// Получить детали группы
export const getGroupById = async (req, res) => {
    try {
        const { id } = req.params;

        const group = await prisma.group.findUnique({
            where: { id: parseInt(id) },
            include: {
                users: {
                    select: { id: true, fullName: true, email: true, role: true, avatarUrl: true }
                }
            }
        });

        if (!group) {
            return res.status(404).json({ error: 'Группа не найдена' });
        }

        res.json({ group });
    } catch (error) {
        console.error('Ошибка получения группы:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};