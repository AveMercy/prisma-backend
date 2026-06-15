import { PrismaClient } from '@prisma/client';
import { checkAchievements } from '../utils/achievements.js';

const prisma = new PrismaClient();

export const getMyCourses = async (req, res) => {
    try {
        const userId = req.user.id;

        const enrollments = await prisma.courseEnrollment.findMany({
            where: { userId },
            include: {
                course: {
                    include: {
                        author: { select: { fullName: true } },
                        category: true,
                        tags: true,
                        _count: { select: { modules: true } }
                    }
                }
            }
        });

        const courses = enrollments.map(e => ({
            ...e.course,
            enrollment: { status: e.status }
        }));

        if (courses.length === 0) {
            const allCourses = await prisma.course.findMany({
                where: { isPublished: true },
                include: {
                    author: { select: { fullName: true } },
                    category: true,
                    tags: true,
                    _count: { select: { modules: true } }
                }
            });
            return res.json({ courses: allCourses.map(c => ({ ...c, enrollment: { status: 'active' } })) });
        }

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
                tags: true,
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

// Записаться на курс
export const enrollCourse = async (req, res) => {
    try {
        const { courseId } = req.body;
        const userId = req.user.id;

        const existing = await prisma.courseEnrollment.findUnique({
            where: { userId_courseId: { userId, courseId: parseInt(courseId) } }
        });

        if (existing) {
            return res.status(400).json({ error: 'Вы уже записаны на этот курс' });
        }

        await prisma.courseEnrollment.create({
            data: { userId, courseId: parseInt(courseId) }
        });

        res.json({ message: 'Вы записаны на курс' });
    } catch (error) {
        console.error('Ошибка записи на курс:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

// Отписаться от курса
export const unenrollCourse = async (req, res) => {
    try {
        const { courseId } = req.body;
        const userId = req.user.id;

        await prisma.courseEnrollment.deleteMany({
            where: { userId, courseId: parseInt(courseId) }
        });

        res.json({ message: 'Вы отписались от курса' });
    } catch (error) {
        console.error('Ошибка отписки:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

// Изменить статус курса (избранное/архив)
export const updateCourseStatus = async (req, res) => {
    try {
        const { courseId, status } = req.body;
        const userId = req.user.id;

        const enrollment = await prisma.courseEnrollment.update({
            where: { userId_courseId: { userId, courseId: parseInt(courseId) } },
            data: { status: status || 'active' }
        });

        res.json(enrollment);
    } catch (error) {
        console.error('Ошибка обновления статуса:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};