import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Запушить код в репозиторий GitHub
export const pushToGithub = async (req, res) => {
    try {
        const { code, repoName, fileName, commitMessage } = req.body;
        const userId = req.user.id;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { githubToken: true, github: true }
        });

        if (!user?.githubToken) {
            return res.status(400).json({ error: 'Привяжите GitHub токен в профиле' });
        }

        const username = user.github || 'student';
        const url = `https://api.github.com/repos/${username}/${repoName}/contents/${fileName || 'solution.js'}`;

        // Кодируем код в Base64
        const content = Buffer.from(code).toString('base64');

        // Проверяем, существует ли файл
        let sha = null;
        try {
            const checkRes = await fetch(url, {
                headers: {
                    'Authorization': `token ${user.githubToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                },
            });
            if (checkRes.ok) {
                const data = await checkRes.json();
                sha = data.sha;
            }
        } catch {}

        // Создаём или обновляем файл
        const body = {
            message: commitMessage || 'Практическая работа с Prisma LMS',
            content,
            ...(sha && { sha }),
        };

        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${user.githubToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const err = await response.json();
            return res.status(response.status).json({ error: err.message || 'Ошибка GitHub API' });
        }

        const data = await response.json();
        res.json({ message: 'Код запушен в GitHub!', url: data.content?.html_url });
    } catch (error) {
        console.error('Ошибка пуша:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

// Получить репозитории пользователя
export const getRepos = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { githubToken: true, github: true }
        });

        if (!user?.githubToken || !user?.github) {
            return res.json({ repos: [] });
        }

        const response = await fetch(`https://api.github.com/users/${user.github}/repos?sort=updated&per_page=10`, {
            headers: {
                'Authorization': `token ${user.githubToken}`,
                'Accept': 'application/vnd.github.v3+json',
            },
        });

        if (!response.ok) return res.json({ repos: [] });

        const repos = await response.json();
        res.json({
            repos: repos.map((r) => ({
                id: r.id,
                name: r.name,
                description: r.description,
                url: r.html_url,
                stars: r.stargazers_count,
                language: r.language,
                updatedAt: r.updated_at,
            })),
        });
    } catch (error) {
        console.error('Ошибка получения репо:', error);
        res.json({ repos: [] });
    }
};