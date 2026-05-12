import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Получить все категории
export const getAllCategories = async (req, res) => {
    try {
        const categories = await prisma.category.findMany({
            include: {
                _count: {
                    select: { courses: true } // Считаем количество курсов в категории
                }
            }
        });
        res.json(categories);
    } catch (error) {
        console.error('Ошибка получения категорий:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

// Создать категорию
export const createCategory = async (req, res) => {
    try {
        const { name } = req.body;  // убрал description

        const category = await prisma.category.create({
            data: { name }  // убрал description
        });

        res.status(201).json(category);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Категория с таким именем уже существует.' });
        }
        console.error('Ошибка создания категории:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

// Удалить категорию
export const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.category.delete({
            where: { id: parseInt(id) }
        });
        res.json({ message: 'Категория удалена' });
    } catch (error) {
        console.error('Ошибка удаления категории:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};