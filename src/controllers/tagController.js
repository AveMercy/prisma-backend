import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Получить все теги (с возможностью фильтрации по типу)
export const getAllTags = async (req, res) => {
    try {
        const { type } = req.query; // Например: ?type=language

        const tags = await prisma.tag.findMany({
            where: {
                ...(type && { type }) // Если передан тип, фильтруем по нему
            }
        });
        res.json(tags);
    } catch (error) {
        console.error('Ошибка получения тегов:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

// Создать новый тег
export const createTag = async (req, res) => {
    try {
        const { name, type } = req.body;

        const tag = await prisma.tag.create({
            data: {
                name,
                type: type || 'general'
            }
        });

        res.status(201).json(tag);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Тег с таким именем уже существует.' });
        }
        console.error('Ошибка создания тега:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

// Удалить тег
export const deleteTag = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.tag.delete({
            where: { id: parseInt(id) }
        });
        res.json({ message: 'Тег удален' });
    } catch (error) {
        console.error('Ошибка удаления тега:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};