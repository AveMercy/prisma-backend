import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function checkAchievements(userId) {
    try {
        const completedLectures = await prisma.userProgress.count({
            where: { userId, isCompleted: true }
        });

        const submissionsCount = await prisma.submission.count({
            where: { studentId: userId }
        });

        const reactionsCount = await prisma.reaction.count({
            where: { userId }
        });

        const enrollmentsCount = await prisma.courseEnrollment.count({
            where: { userId }
        });

        const hasGroup = await prisma.user.findUnique({
            where: { id: userId },
            select: { groupId: true }
        });

        const hasAvatar = await prisma.user.findUnique({
            where: { id: userId },
            select: { avatarUrl: true }
        });

        const toAward = [];

        if (completedLectures >= 1) toAward.push('FIRST_LECTURE');
        if (completedLectures >= 5) toAward.push('FIVE_LECTURES');
        if (completedLectures >= 20) toAward.push('TWENTY_LECTURES');
        if (completedLectures >= 50) toAward.push('FIFTY_LECTURES');
        if (submissionsCount >= 1) toAward.push('FIRST_SUBMISSION');
        if (submissionsCount >= 5) toAward.push('FIVE_SUBMISSIONS');
        if (reactionsCount >= 10) toAward.push('TEN_REACTIONS');
        if (enrollmentsCount >= 5) toAward.push('FIVE_COURSES');
        if (hasGroup?.groupId) toAward.push('JOIN_GROUP');
        if (hasAvatar?.avatarUrl) toAward.push('PROFILE_AVATAR');

        for (const code of toAward) {
            const achievement = await prisma.achievement.findFirst({
                where: { requirementCode: code }
            });
            if (achievement) {
                await prisma.userAchievement.upsert({
                    where: {
                        userId_achievementId: {
                            userId,
                            achievementId: achievement.id
                        }
                    },
                    create: { userId, achievementId: achievement.id },
                    update: {}
                });
            }
        }
    } catch (error) {
        console.error('Ошибка проверки ачивок:', error);
    }
}