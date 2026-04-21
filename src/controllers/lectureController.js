import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createLecture = async (req, res) => {
    try {
        const { title, content, videoUrl, type, order, moduleId } = req.body;

        const lecture = await prisma.lecture.create({
            data: {
                title,
                content,
                videoUrl,
                type: type || 'theory',
                order: parseInt(order) || 0,
                moduleId: parseInt(moduleId)
            }
        });

        res.status(201).json(lecture);
    } catch (error) {
        console.error('Ошибка при создании лекции:', error);
        res.status(500).json({ error: 'Ошибка сервера при создании лекции.' });
    }
};

export const getLectureById = async (req, res) => {
    try {
        const { id } = req.params;
        const lecture = await prisma.lecture.findUnique({
            where: { id: parseInt(id) },
            include: {
                module: {
                    include: { course: true }
                }
            }
        });

        if (!lecture) {
            return res.status(404).json({ error: 'Лекция не найдена.' });
        }

        res.json(lecture);
    } catch (error) {
        console.error('Ошибка при получении лекции:', error);
        res.status(500).json({ error: 'Ошибка сервера.' });
    }
};

export const updateLecture = async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await prisma.lecture.update({
            where: { id: parseInt(id) },
            data: req.body
        });
        res.json(updated);
    } catch (error) {
        console.error('Ошибка при обновлении лекции:', error);
        res.status(500).json({ error: 'Ошибка сервера.' });
    }
};

export const deleteLecture = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.lecture.delete({
            where: { id: parseInt(id) }
        });
        res.json({ message: 'Лекция удалена.' });
    } catch (error) {
        console.error('Ошибка при удалении лекции:', error);
        res.status(500).json({ error: 'Ошибка сервера.' });
    }
};