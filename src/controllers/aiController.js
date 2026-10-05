import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

const AUTH_KEY = process.env.GIGACHAT_AUTH_KEY;
const SCOPE = process.env.GIGACHAT_SCOPE || 'GIGACHAT_API_PERS';
const MODEL = process.env.GIGACHAT_MODEL || 'GigaChat-2';
const API_URL = 'https://api.giga.chat/v1/chat/completions';
const OAUTH_URL = 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth';

// ─────────────────────────────────────────────
// Кэш access token (живёт 30 мин, обновляем заранее)
// ─────────────────────────────────────────────
let tokenCache = { value: null, expiresAt: 0 };

async function getAccessToken() {
    const now = Date.now();
    if (tokenCache.value && tokenCache.expiresAt > now + 60_000) {
        return tokenCache.value;
    }

    const response = await fetch(OAUTH_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
            'RqUID': randomUUID(),
            'Authorization': `Basic ${AUTH_KEY}`
        },
        body: new URLSearchParams({ scope: SCOPE })
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`GigaChat OAuth error ${response.status}: ${text}`);
    }

    const data = await response.json();
    tokenCache = {
        value: data.access_token,
        expiresAt: data.expires_at || (now + 25 * 60 * 1000)
    };
    return tokenCache.value;
}

// ─────────────────────────────────────────────
// Универсальный вызов GigaChat
// ─────────────────────────────────────────────
async function callGigaChat({ system, user, temperature = 0.3, maxTokens = 2000 }) {
    const token = await getAccessToken();

    const messages = [];
    if (system) messages.push({ role: 'system', content: system });
    messages.push({ role: 'user', content: user });

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            model: MODEL,
            messages,
            temperature,
            max_tokens: maxTokens
        })
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`GigaChat API error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
}

// ─────────────────────────────────────────────
// Извлечение JSON из ответа модели
// ─────────────────────────────────────────────
function extractJson(raw, isArray = false) {
    if (!raw) return null;
    const pattern = isArray ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/;
    const match = raw.match(pattern);
    if (!match) return null;
    try {
        return JSON.parse(match[0]);
    } catch {
        return null;
    }
}

// ─────────────────────────────────────────────
// 1. askAI — вопрос по лекции
// ─────────────────────────────────────────────
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

        const system = `Ты — ИИ-помощник на образовательной платформе CodeLearn.
Помогай студентам разбираться в материале лекции.
Объясняй сложные концепции простыми словами.
Отвечай на русском языке.`;

        const user = `Контекст лекции:
Название: "${lecture.title}"
Содержание: ${lecture.content || 'Материал пока не добавлен'}

Вопрос студента: ${question}`;

        const answer = await callGigaChat({ system, user, temperature: 0.3, maxTokens: 1000 });

        res.json({ answer: answer || 'Не удалось получить ответ' });
    } catch (error) {
        console.error('Ошибка AI:', error);
        res.status(500).json({ error: 'Ошибка при обращении к ИИ. Попробуйте позже.' });
    }
};

// ─────────────────────────────────────────────
// 2. generateLecture — генерация лекции из текста
// ─────────────────────────────────────────────
export const generateLecture = async (req, res) => {
    try {
        const { text } = req.body;

        if (!text?.trim()) {
            return res.status(400).json({ error: 'Текст не может быть пустым' });
        }

        const system = `Ты — генератор лекций для платформы CodeLearn.
Превращаешь текст в структурированную лекцию.
Отвечаешь ТОЛЬКО валидным JSON-массивом блоков, без markdown и пояснений.`;

        const user = `Формат ответа — ТОЛЬКО JSON-массив блоков. Без пояснений, без markdown-разметки. Только чистый JSON.

Типы блоков:
- heading: { "type": "heading", "level": 1|2|3, "content": "..." }
- text: { "type": "text", "content": "..." }
- section: { "type": "section", "number": 1, "title": "...", "content": "..." }
- code: { "type": "code", "language": "javascript|html|css|python", "code": "..." }
- info: { "type": "info", "title": "...", "content": "..." }
- warning: { "type": "warning", "title": "...", "content": "..." }
- success: { "type": "success", "title": "...", "content": "..." }

Правила:
1. Начинай с заголовка H1
2. Разбивай на логические секции
3. Выделяй код в блоки code
4. Важные моменты — в info/warning/success
5. Пиши на русском языке
6. Ответь ТОЛЬКО JSON-массивом

Текст для генерации:
${text}`;

        const rawText = await callGigaChat({ system, user, temperature: 0.3, maxTokens: 4000 });
        const blocks = extractJson(rawText, true);

        if (!blocks) {
            return res.status(500).json({ error: 'Не удалось распарсить ответ ИИ' });
        }

        res.json({ blocks });
    } catch (error) {
        console.error('Ошибка генерации:', error);
        res.status(500).json({ error: 'Ошибка при генерации лекции' });
    }
};

// ─────────────────────────────────────────────
// 3. reviewCode — быстрая проверка кода
// ─────────────────────────────────────────────
export const reviewCode = async (req, res) => {
    try {
        const { code, language, taskDescription } = req.body;

        if (!code?.trim()) {
            return res.status(400).json({ error: 'Код не может быть пустым' });
        }

        const system = `Ты — ИИ-ментор по программированию на платформе Prisma.
Проверяешь код студента и даёшь полезные рекомендации.
Отвечаешь ТОЛЬКО валидным JSON-объектом, без markdown и пояснений.`;

        const user = `Формат ответа — ТОЛЬКО JSON-объект. Без markdown, без \`\`\`json.

{
  "passed": true,
  "syntaxOk": true,
  "suggestions": ["совет 1", "совет 2"],
  "hint": "подсказка если нужно",
  "rating": "отлично"
}

Возможные rating: "отлично", "хорошо", "нужны правки".
passed и syntaxOk — boolean.

Контекст задания:
Язык: ${language || 'javascript'}
Задача: ${taskDescription || 'Написать корректный и рабочий код'}

Код студента:
${code}`;

        const rawText = await callGigaChat({ system, user, temperature: 0.2, maxTokens: 2000 });
        const review = extractJson(rawText, false);

        if (!review) {
            return res.status(500).json({ error: 'Не удалось распарсить JSON-ответ от ИИ' });
        }

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

// ─────────────────────────────────────────────
// 4. submitCodeReview — строгая проверка с оценкой
// ─────────────────────────────────────────────
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

        const system = `Ты — строгий, но справедливый ИИ-ревьюер на платформе Prisma.
Проверяешь код студента СТРОГО ПО ЗАДАНИЮ.
Отвечаешь ТОЛЬКО валидным JSON-объектом, без markdown.`;

        const user = `ЗАДАНИЕ: "${lecture?.title || 'Практическая работа'}"
ОПИСАНИЕ: ${taskDescription}
ЯЗЫК: ${language || 'javascript'}

Критерии проверки:
1. Соответствие кода заданию (самое важное!)
2. Правильность решения
3. Читаемость кода
4. Антипаттерны и уязвимости
5. Оптимальность

Формат ответа — ТОЛЬКО JSON-объект. Без markdown.
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

        const rawText = await callGigaChat({ system, user, temperature: 0.2, maxTokens: 2000 });
        const review = extractJson(rawText, false);

        if (!review) {
            return res.json({
                review: {
                    passed: false, grade: 3,
                    summary: 'Не удалось обработать ответ ИИ.',
                    issues: [],
                    positiveFeedback: '',
                }
            });
        }

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

// ─────────────────────────────────────────────
// 5. generateTest — генерация теста
// ─────────────────────────────────────────────
export const generateTest = async (req, res) => {
    try {
        const { topic, questionCount = 5 } = req.body;

        if (!topic?.trim()) {
            return res.status(400).json({ error: 'Тема не может быть пустой' });
        }

        const system = `Ты — генератор тестов. Отвечаешь ТОЛЬКО валидным JSON-массивом, без markdown.`;

        const user = `Сгенерируй тест по теме: "${topic}".
Количество вопросов: ${questionCount}.
Каждый вопрос должен иметь 4 варианта ответа и один правильный.

Формат ответа — ТОЛЬКО JSON-массив:
[
  {
    "question": "текст вопроса",
    "options": ["вариант A", "вариант B", "вариант C", "вариант D"],
    "correctIndex": 0
  }
]`;

        const rawText = await callGigaChat({ system, user, temperature: 0.3, maxTokens: 2000 });
        const questions = extractJson(rawText, true) || [];

        res.json({ questions });
    } catch (error) {
        console.error('Ошибка генерации теста:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};