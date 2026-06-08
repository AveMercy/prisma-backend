import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Создать задание для лекции
export const createAssignment = async (req, res) => {
    try {
        const { lectureId, title, taskDescription, dueDate } = req.body;

        const assignment = await prisma.assignment.create({
            data: {
                lectureId: parseInt(lectureId),
                title,
                taskDescription,
                dueDate: dueDate ? new Date(dueDate) : null
            }
        });

        res.status(201).json(assignment);
    } catch (error) {
        console.error('Ошибка создания задания:', error);
        res.status(500).json({ error: 'Ошибка сервера при создании задания.' });
    }
};

// Получить задания по лекции
export const getAssignmentsByLecture = async (req, res) => {
    try {
        const { lectureId } = req.params;
        const assignments = await prisma.assignment.findMany({
            where: { lectureId: parseInt(lectureId) },
            include: {
                submissions: {
                    where: { studentId: req.user.id } // ← id вместо userId
                }
            }
        });
        res.json(assignments);
    } catch (error) {
        console.error('Ошибка получения заданий:', error);
        res.status(500).json({ error: 'Ошибка сервера.' });
    }
};
// Получить все задания студента (по его курсам)
export const getMyAssignments = async (req, res) => {
    try {
        const userId = req.user.id;

        // Получаем курсы, на которые записан студент
        const enrollments = await prisma.courseEnrollment.findMany({
            where: { userId },
            select: { courseId: true }
        });

        const courseIds = enrollments.map(e => e.courseId);

        // Получаем задания из лекций этих курсов
        const assignments = await prisma.assignment.findMany({
            where: {
                lecture: {
                    module: {
                        courseId: { in: courseIds }
                    }
                }
            },
            include: {
                lecture: {
                    select: {
                        id: true,
                        title: true,
                        module: {
                            select: {
                                id: true,
                                title: true,
                                course: {
                                    select: { id: true, title: true }
                                }
                            }
                        }
                    }
                },
                submissions: {
                    where: { studentId: userId },
                    select: { id: true, grade: true, submittedAt: true }
                }
            },
            orderBy: { dueDate: 'asc' }
        });

        res.json({ assignments });
    } catch (error) {
        console.error('Ошибка получения заданий:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

// Получить все задания преподавателя (по его курсам)
export const getTeacherAssignments = async (req, res) => {
    try {
        const assignments = await prisma.assignment.findMany({
            include: {
                lecture: {
                    select: {
                        id: true,
                        title: true,
                        module: {
                            select: {
                                id: true,
                                title: true,
                                course: { select: { id: true, title: true } }
                            }
                        }
                    }
                },
                submissions: {
                    select: {
                        id: true, grade: true, submittedAt: true,
                        student: { select: { id: true, fullName: true } }
                    }
                }
            },
            orderBy: { dueDate: 'asc' }
        });

        res.json({ assignments });
    } catch (error) {
        console.error('Ошибка получения заданий:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};