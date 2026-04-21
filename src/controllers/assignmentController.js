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
                    where: { studentId: req.user.userId } // Студент видит только свою сдачу
                }
            }
        });
        res.json(assignments);
    } catch (error) {
        console.error('Ошибка получения заданий:', error);
        res.status(500).json({ error: 'Ошибка сервера.' });
    }
};