import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createModule = async (req, res) => {
    try {
        const { title, orderIndex, courseId } = req.body;

        const newModule = await prisma.module.create({
            data: {
                title,
                orderIndex: parseInt(orderIndex) || 0,
                courseId: parseInt(courseId)
            }
        });
        res.status(201).json(newModule);
    } catch (error) {
        console.error('Ошибка при создании модуля:', error);
        res.status(500).json({ error: 'Ошибка сервера при создании модуля.' });
    }
};

export const getModulesByCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const modules = await prisma.module.findMany({
            where: { courseId: parseInt(courseId) },
            orderBy: { orderIndex: 'asc' },
            include: {
                lectures: {
                    orderBy: { orderIndex: 'asc' },
                    select: { id: true, title: true, type: true, orderIndex: true, isVisible: true }
                }
            }
        });
        res.json(modules);
    } catch (error) {
        console.error('Ошибка при получении модулей:', error);
        res.status(500).json({ error: 'Ошибка сервера.' });
    }
};

export const updateModule = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedModule = await prisma.module.update({
            where: { id: parseInt(id) },
            data: req.body
        });
        res.json(updatedModule);
    } catch (error) {
        console.error('Ошибка при обновлении модуля:', error);
        res.status(500).json({ error: 'Ошибка при обновлении.' });
    }
};

export const deleteModule = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.module.delete({ where: { id: parseInt(id) } });
        res.json({ message: 'Модуль успешно удален.' });
    } catch (error) {
        console.error('Ошибка при удалении модуля:', error);
        res.status(500).json({ error: 'Ошибка при удалении.' });
    }
};