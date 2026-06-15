import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const API_KEY = process.env.YANDEX_GPT_API_KEY;
const FOLDER_ID = process.env.YANDEX_FOLDER_ID;
const MODEL = 'yandexgpt-5-lite/latest';

export const askAI = async (req, res) => {
    try {
        const { lectureId, question } = req.body;

        if (!question?.trim()) {
            return res.status(400).json({ error: 'Вопрос не может быть пустым' });
        }

        const lecture = await prisma.lecture.findUnique({
            where: { id: parseInt(lectureId) },
            select: { title: true, content: true }
        });

        if (!lecture) {
            return res.status(404).json({ error: 'Лекция не найдена' });
        }

        const url = 'https://ai.api.cloud.yandex.net/v1/responses';

        const body = {
            model: `gpt://${FOLDER_ID}/${MODEL}`,
            temperature: 0.3,
            maxOutputTokens: 1000,
            input: `Ты — ИИ-помощник на образовательной платформе CodeLearn.
Помогай студентам разбираться в материале лекции.
Объясняй сложные концепции простыми словами.
Отвечай на русском языке.

Контекст лекции:
Название: "${lecture.title}"
Содержание: ${lecture.content || 'Материал пока не добавлен'}

Вопрос студента: ${question}`
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Api-Key ${API_KEY}`,
                'x-folder-id': FOLDER_ID
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('YandexGPT error:', JSON.stringify(data));
            return res.status(response.status).json({
                error: data.error?.message || 'Ошибка API Яндекс'
            });
        }

        const answer = data.output?.[0]?.content?.[0]?.text || 'Не удалось получить ответ';

        res.json({ answer });
    } catch (error) {
        console.error('Ошибка AI:', error);
        res.status(500).json({ error: 'Ошибка при обращении к ИИ. Попробуйте позже.' });
    }
};
export const generateLecture = async (req, res) => {
    try {
        const { text } = req.body;

        if (!text?.trim()) {
            return res.status(400).json({ error: 'Текст не может быть пустым' });
        }

        const url = 'https://ai.api.cloud.yandex.net/v1/responses';

        const prompt = `Ты — генератор лекций для платформы CodeLearn.
Преврати текст в структурированную лекцию.

Формат ответа — ТОЛЬКО JSON-массив блоков. Без пояснений, без markdown-разметки. Только чистый JSON.

Типы блоков:
- heading: { "type": "heading", "level": 1|2|3, "content": "..." }
- text: { "type": "text", "content": "..." } (обычный текст)
- section: { "type": "section", "number": 1, "title": "...", "content": "..." } (нумерованная секция)
- code: { "type": "code", "language": "javascript|html|css|python", "code": "..." }
- info: { "type": "info", "title": "...", "content": "..." } (инфо-панель)
- warning: { "type": "warning", "title": "...", "content": "..." } (предупреждение)
- success: { "type": "success", "title": "...", "content": "..." } (совет)

Правила:
1. Начинай с заголовка H1
2. Разбивай на логические секции
3. Выделяй код в блоки code
4. Важные моменты — в info/warning/success
5. Пиши на русском языке
6. Ответь ТОЛЬКО JSON-массивом, без текста до или после

Текст для генерации:
${text}`;

        const body = {
            model: `gpt://${FOLDER_ID}/${MODEL}`,
            temperature: 0.3,
            maxOutputTokens: 4000,
            input: prompt
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Api-Key ${API_KEY}`,
                'x-folder-id': FOLDER_ID
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('YandexGPT error:', JSON.stringify(data));
            return res.status(response.status).json({ error: 'Ошибка генерации' });
        }

        const rawText = data.output?.[0]?.content?.[0]?.text || '';

        // Извлекаем JSON из ответа (на случай, если ИИ добавит лишний текст)
        const jsonMatch = rawText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            return res.status(500).json({ error: 'Не удалось распарсить ответ ИИ' });
        }

        const blocks = JSON.parse(jsonMatch[0]);

        res.json({ blocks });
    } catch (error) {
        console.error('Ошибка генерации:', error);
        res.status(500).json({ error: 'Ошибка при генерации лекции' });
    }
};

export const reviewCode = async (req, res) => {
    try {
        const { code, language, taskDescription } = req.body;

        if (!code?.trim()) {
            return res.status(400).json({ error: 'Код не может быть пустым' });
        }

        const url = 'https://ai.api.cloud.yandex.net/v1/responses';

        const prompt = `Ты — ИИ-ментор по программированию на платформе Prisma.
Твоя задача — проверять код студента и давать полезные рекомендации.

Формат ответа — ТОЛЬКО JSON-объект. Без пояснений, без markdown-разметки (не оборачивай в \`\`\`json). Только чистый JSON.

Структура JSON-объекта:
{
  "passed": true,
  "syntaxOk": true,
  "suggestions": ["совет 1", "совет 2"],
  "hint": "подсказка если нужно",
  "rating": "отлично"
}

Возможные значения для "rating": "отлично", "хорошо", "нужны правки".
Значения "passed" и "syntaxOk" должны быть boolean (true или false).

Контекст задания:
Язык: ${language || 'javascript'}
Задача: ${taskDescription || 'Написать корректный и рабочий код'}

Код студента для проверки:
${code}`;

        const body = {
            model: `gpt://${FOLDER_ID}/${MODEL}`,
            temperature: 0.2, // Низкая температура для более точного следования JSON-формату
            maxOutputTokens: 2000,
            input: prompt
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Api-Key ${API_KEY}`,
                'x-folder-id': FOLDER_ID
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('YandexGPT error:', JSON.stringify(data));
            return res.status(response.status).json({ error: 'Ошибка генерации ревью нейросетью' });
        }

        const rawText = data.output?.[0]?.content?.[0]?.text || '';

        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return res.status(500).json({ error: 'Не удалось распарсить JSON-ответ от ИИ' });
        }

        const review = JSON.parse(jsonMatch[0]);

        res.json({ review });
    } catch (error) {
        console.error('Ошибка ревью кода:', error);
        res.json({
            review: {
                passed: false,
                syntaxOk: true,
                suggestions: ['Критическая ошибка на сервере при разборе кода. Проверьте логи.'],
                hint: error.message,
                rating: 'нужны правки'
            }
        });
    }
};

export const submitCodeReview = async (req, res) => {
    try {
        const { code, language, lectureId } = req.body;

        if (!code?.trim() || code.trim().startsWith('// Напишите ваш код здесь')) {
            return res.json({
                review: {
                    passed: false, grade: 2,
                    summary: 'Вы отправили пустой код.',
                    issues: [{ severity: 'error', line: 1, message: 'Код не может быть пустым.', suggestion: 'Напишите решение согласно заданию.' }],
                    positiveFeedback: '',
                }
            });
        }

        const lecture = await prisma.lecture.findUnique({
            where: { id: parseInt(lectureId) },
            select: { title: true, content: true }
        });

        let taskDescription = 'Написать код согласно заданию';
        if (lecture?.content) {
            try {
                const blocks = JSON.parse(lecture.content);
                taskDescription = blocks
                    .filter((b) => b.type === 'text' || b.type === 'heading')
                    .map((b) => b.content)
                    .join('\n') || taskDescription;
            } catch {
                taskDescription = lecture.content;
            }
        }

        const url = 'https://ai.api.cloud.yandex.net/v1/responses';

        const prompt = `Ты — строгий, но справедливый ИИ-ревьюер на платформе Prisma.
Проверь код студента СТРОГО ПО ЗАДАНИЮ. Если код не соответствует заданию — это ошибка.

ЗАДАНИЕ: "${lecture?.title || 'Практическая работа'}"
ОПИСАНИЕ: ${taskDescription}
ЯЗЫК: ${language || 'javascript'}

Критерии проверки:
1. Соответствие кода заданию (самое важное!)
2. Правильность решения
3. Читаемость кода
4. Антипаттерны и уязвимости
5. Оптимальность

Формат ответа — ТОЛЬКО JSON-объект. Без пояснений, без markdown.
{
  "passed": true/false,
  "grade": число от 2 до 5,
  "summary": "краткий вердикт",
  "issues": [
    { "severity": "error/warning/info", "line": номер, "message": "описание", "suggestion": "как исправить" }
  ],
  "positiveFeedback": "что сделано хорошо"
}

Код студента:
${code}`;

        const body = {
            model: `gpt://${FOLDER_ID}/${MODEL}`,
            temperature: 0.2,
            maxOutputTokens: 2000,
            input: prompt
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Api-Key ${API_KEY}`,
                'x-folder-id': FOLDER_ID
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('YandexGPT error:', JSON.stringify(data));
            return res.json({
                review: {
                    passed: false, grade: 3,
                    summary: 'Ошибка при проверке кода. Попробуйте позже.',
                    issues: [],
                    positiveFeedback: '',
                }
            });
        }

        const rawText = data.output?.[0]?.content?.[0]?.text || '';
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
            return res.json({
                review: {
                    passed: false, grade: 3,
                    summary: 'Не удалось обработать ответ ИИ.',
                    issues: [],
                    positiveFeedback: '',
                }
            });
        }

        const review = JSON.parse(jsonMatch[0]);
        res.json({ review });

    } catch (error) {
        console.error('Ошибка код-ревью:', error);
        res.json({
            review: {
                passed: false, grade: 3,
                summary: 'Не удалось выполнить проверку. Попробуйте позже.',
                issues: [],
                positiveFeedback: '',
            }
        });
    }
};
export const generateTest = async (req, res) => {
    try {
        const { topic, questionCount = 5 } = req.body;

        if (!topic?.trim()) {
            return res.status(400).json({ error: 'Тема не может быть пустой' });
        }

        const url = 'https://ai.api.cloud.yandex.net/v1/responses';
        const prompt = `Сгенерируй тест по теме: "${topic}".
Количество вопросов: ${questionCount}.
Каждый вопрос должен иметь 4 варианта ответа и один правильный.

Формат ответа — ТОЛЬКО JSON-массив. Без markdown, без пояснений.
[
  {
    "question": "текст вопроса",
    "options": ["вариант A", "вариант B", "вариант C", "вариант D"],
    "correctIndex": 0
  }
]`;

        const body = {
            model: `gpt://${FOLDER_ID}/${MODEL}`,
            temperature: 0.3,
            maxOutputTokens: 2000,
            input: prompt
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Api-Key ${API_KEY}`,
                'x-folder-id': FOLDER_ID
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        const rawText = data.output?.[0]?.content?.[0]?.text || '';
        const jsonMatch = rawText.match(/\[[\s\S]*\]/);
        const questions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

        res.json({ questions });
    } catch (error) {
        console.error('Ошибка генерации теста:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};