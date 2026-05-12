import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getMyCourses = async (req, res) => {
    try {
        // Временная заглушка: возвращаем все курсы
        // Позже заменим на фильтрацию по enrolled
        const courses = await prisma.course.findMany({
            where: { isPublished: true },
            include: {
                author: { select: { fullName: true } },
                category: true,
                _count: { select: { modules: true } }
            }
        });
        res.json({ courses });
    } catch (error) {
        console.error('Ошибка получения моих курсов:', error);
        res.status(500).json({ error: 'Ошибка сервера.' });
    }
};
// Получение всех курсов с фильтрацией (опционально)
export const getAllCourses = async (req, res) => {
    try {
        const { categoryId, level } = req.query;

        const courses = await prisma.course.findMany({
            where: {
                ...(categoryId && { categoryId: parseInt(categoryId) }),
                ...(level && { level })
            },
            include: {
                author: {
                    select: { fullName: true }
                },
                category: true,
                _count: {
                    select: { modules: true }
                }
            }
        });
        res.json(courses);
    } catch (error) {
        console.error('Ошибка при получении курсов:', error);
        res.status(500).json({ error: 'Ошибка сервера при получении списка курсов.' });
    }
};

// Создание курса (только для учителей/админов)
export const createCourse = async (req, res) => {
    try {
        const { title, description, level, categoryId, bannerUrl } = req.body;
        const authorId = req.user.id;
        const newCourse = await prisma.course.create({
            data: {
                title,
                description,
                level: level || 'beginner',
                bannerUrl,
                authorId,
                categoryId: categoryId ? parseInt(categoryId) : null
            }
        });

        res.status(201).json(newCourse);
    } catch (error) {
        console.error('Ошибка при создании курса:', error);
        res.status(500).json({ error: 'Ошибка сервера при создании курса.' });
    }
};

// Получение детальной информации о курсе (со всеми модулями и лекциями)
export const getCourseById = async (req, res) => {
    try {
        const { id } = req.params;
        const course = await prisma.course.findUnique({
            where: { id: parseInt(id) },
            orderBy: { orderIndex: 'asc' },
            include: {
                author: {
                    select: { id: true, fullName: true, avatarUrl: true }
                },
                category: true,
                modules: {
                    orderBy: { orderIndex: 'asc' },
                    include: {
                        lectures: {
                            orderBy: { orderIndex: 'asc' },
                            select: { id: true, title: true, type: true }
                        }


                    }
                }
            }
        });

        if (!course) {
            return res.status(404).json({ error: 'Курс не найден.' });
        }

        res.json(course);
    } catch (error) {
        console.error('Ошибка при получении курса:', error);
        res.status(500).json({ error: 'Ошибка сервера.' });
    }
};

// Обновление курса
export const updateCourse = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedCourse = await prisma.course.update({
            where: { id: parseInt(id) },
            data: req.body
        });
        res.json(updatedCourse);
    } catch (error) {
        console.error('Ошибка при обновлении курса:', error);
        res.status(500).json({ error: 'Ошибка при обновлении.' });
    }
};

// Удаление курса
export const deleteCourse = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.course.delete({
            where: { id: parseInt(id) }
        });
        res.json({ message: 'Курс удален.' });
    } catch (error) {
        console.error('Ошибка при удалении курса:', error);
        res.status(500).json({ error: 'Ошибка при удалении.' });
    }
};