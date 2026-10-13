import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { rateLimit } from '../services/simpleRateLimit.js';

const prisma = new PrismaClient();

const AUTH_KEY = process.env.GIGACHAT_AUTH_KEY;
const SCOPE = process.env.GIGACHAT_SCOPE || 'GIGACHAT_API_PERS';
const MODEL = process.env.GIGACHAT_MODEL || 'GigaChat-2';
const MODEL_PRO = process.env.GIGACHAT_MODEL_PRO || 'GigaChat-2-Pro';
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
// Универсальный вызов GigaChat (возвращает { content, usage, model })
// ─────────────────────────────────────────────

async function callGigaChat({ system, user, temperature = 0.3, maxTokens = 2000, model = null }) {
    const token = await getAccessToken();

    const messages = [];
    if (system) messages.push({ role: 'system', content: system });
    messages.push({ role: 'user', content: user });

    const usedModel = model || MODEL;

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            model: usedModel,
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

    const finishReason = data.choices?.[0]?.finish_reason || 'unknown';
    const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

    // ─── ЛОГИРОВАНИЕ ───────────────────────────
    console.log('──── GigaChat response ────');
    console.log('model:', data.model || usedModel);
    console.log('finish_reason:', finishReason);
    console.log('usage:', JSON.stringify(usage));
    if (finishReason === 'length') {
        console.warn('⚠️  Response TRUNCATED by max_tokens!');
    }
    // ───────────────────────────────────────────

    return {
        content: data.choices?.[0]?.message?.content || '',
        usage,
        model: data.model || usedModel,
        finishReason,
    };
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
// Спецификация блоков (для промптов)
// ─────────────────────────────────────────────
const BLOCKS_SPEC = `
ДОСТУПНЫЕ ТИПЫ БЛОКОВ:
- {"type":"heading","level":1,"content":"..."} — H1 (главный заголовок лекции)
- {"type":"heading","level":2,"content":"..."} — H2 (раздел)
- {"type":"heading","level":3,"content":"..."} — H3 (подраздел)
- {"type":"text","content":"..."} — абзац текста (можно markdown: **жирный**, *курсив*, - списки)
- {"type":"section","number":1,"title":"Название","content":"Текст раздела"} — нумерованный раздел
- {"type":"code","language":"javascript","code":"..."} — код. Языки: javascript, jsx, typescript, tsx, python, html, css, bash, sql, dockerfile, json
- {"type":"info","title":"Совет","content":"..."} — совет/примечание
- {"type":"warning","title":"Ошибка","content":"..."} — предупреждение
- {"type":"success","title":"Итог","content":"..."} — важный вывод
`;

const BLOCKS_EXAMPLE = `
ПРИМЕР ПРАВИЛЬНОГО ОТВЕТА:
[
  {"type":"heading","level":1,"content":"Введение в React"},
  {"type":"text","content":"React — это **библиотека** для создания пользовательских интерфейсов."},
  {"type":"heading","level":2,"content":"Компоненты"},
  {"type":"text","content":"Компонент — это функция, возвращающая JSX.\\n- Функциональные компоненты\\n- Классовые компоненты (устарели)"},
  {"type":"code","language":"javascript","code":"function App() {\\n  return <h1>Hello</h1>;\\n}"},
  {"type":"info","title":"Совет","content":"Начинайте с функциональных компонентов."},
  {"type":"success","title":"Итог","content":"React упрощает создание UI."}
]
`;

// ─────────────────────────────────────────────
// Парсер блоков из ответа ИИ (с постобработкой)
// ─────────────────────────────────────────────
function parseBlocksFromAI(rawText) {
    console.log('===== RAW GIGACHAT RESPONSE =====');
    console.log(rawText);
    console.log('===== END =====');
    let cleaned = rawText
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();

    const start = cleaned.indexOf('[');
    const end = cleaned.lastIndexOf(']');
    if (start === -1 || end === -1 || end < start) {
        console.error('Нет JSON-массива:', rawText.slice(0, 500));
        throw new Error('ИИ вернул не JSON. Попробуйте ещё раз.');
    }

    const jsonStr = cleaned.slice(start, end + 1);

    let blocks;
    try {
        blocks = JSON.parse(jsonStr);
    } catch (e) {
        console.error('JSON parse error:', e.message, jsonStr.slice(0, 300));
        throw new Error('Не удалось распарсить ответ ИИ.');
    }

    if (!Array.isArray(blocks) || blocks.length === 0) {
        throw new Error('ИИ вернул пустой массив.');
    }

    return blocks
        .filter(b => b && typeof b === 'object' && b.type)
        .map(block => {
            if (typeof block.content === 'string') {
                block.content = block.content
                    .replace(/<\/?p>/gi, '')
                    .replace(/<\/?li>/gi, '\n- ')
                    .replace(/<\/?ul>/gi, '')
                    .replace(/<\/?ol>/gi, '')
                    .replace(/<\/?h[1-6]>/gi, '')
                    .replace(/<br\s*\/?>/gi, '\n')
                    .replace(/&nbsp;/g, ' ')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&amp;/g, '&')
                    .replace(/\n{3,}/g, '\n\n')
                    .trim();
            }
            if (typeof block.code === 'string') {
                block.code = block.code
                    .replace(/```[a-z]*\n?/gi, '')
                    .replace(/```/g, '')
                    .trim();
            }
            delete block.id;
            return block;
        });
}

// ─────────────────────────────────────────────
// 1. askAI — вопрос по лекции
// ─────────────────────────────────────────────
export const askAI = async (req, res) => {
    try {
        rateLimit(`ai:ask:${req.user.id}`, 20, 60_000);

        const { lectureId, question } = req.body;

        if (!question?.trim()) {
            return res.status(400).json({ error: 'Вопрос не может быть пустым' });
        }

        const safeQuestion = question.slice(0, 2_000);

        const lecture = await prisma.lecture.findUnique({
            where: { id: parseInt(lectureId) },
            select: { title: true, content: true }
        });

        if (!lecture) {
            return res.status(404).json({ error: 'Лекция не найдена' });
        }

        const lectureContent = (lecture.content || '').slice(0, 8_000);

        const system = `Ты — ИИ-помощник на образовательной платформе CodeLearn.
Помогай студентам разбираться в материале лекции.
Объясняй сложные концепции простыми словами.
Отвечай на русском языке.`;

        const user = `Контекст лекции:
Название: "${lecture.title}"
Содержание: ${lectureContent}

Вопрос студента: ${safeQuestion}`;

        const result = await callGigaChat({
            system,
            user,
            temperature: 0.3,
            maxTokens: 1000,
            model: MODEL_PRO,
        });

        res.json({ answer: result.content || 'Не удалось получить ответ' });
    } catch (error) {
        console.error('Ошибка AI:', error);
        if (error.statusCode === 429) {
            return res.status(429).json({ error: error.message });
        }
        res.status(500).json({ error: 'Ошибка при обращении к ИИ. Попробуйте позже.' });
    }
};

// ─────────────────────────────────────────────
// 2. generateLecture — генерация из текста ИЛИ темы
// ─────────────────────────────────────────────
export const generateLecture = async (req, res) => {
    try {
        rateLimit(`ai:gen:${req.user.id}`, 5, 60_000);

        const { text } = req.body;

        if (!text?.trim()) {
            return res.status(400).json({ error: 'Текст не может быть пустым' });
        }

        const trimmed = text.trim().slice(0, 20_000);
        const wordCount = trimmed.split(/\s+/).length;
        const isTopic = wordCount < 20;

        const system = `Ты — API-генератор лекций. Возвращаешь ТОЛЬКО валидный JSON-массив блоков. Без markdown, без HTML, без текста вокруг массива.`;

        let user;

        if (isTopic) {
            user = `Пользователь дал КОРОТКУЮ ТЕМУ. Разверни её в полноценную лекцию.

ТЕМА: "${trimmed}"

ТРЕБОВАНИЯ К ЛЕКЦИИ:
1. Первый блок — heading level 1 с названием темы.
2. 4–7 логических разделов (heading level 2).
3. В каждом разделе — минимум 1 абзац текста.
4. Где уместно — примеры кода в блоке "code" (реальный рабочий код).
5. Где нужно — блоки "info" (советы), "warning" (типичные ошибки), "success" (выводы).
6. В конце — блок "success" с главным выводом.
7. Объём: 1500–2500 слов.
8. Пиши на русском, дружелюбно, но по делу.
9. Поле "id" НЕ добавляй.

${BLOCKS_SPEC}

ФОРМАТ ОТВЕТА: ТОЛЬКО JSON-массив. Первый символ [, последний ]. Без \`\`\`json, без пояснений.

${BLOCKS_EXAMPLE}

Сгенерируй лекцию на тему: "${trimmed}"`;
        } else {
            user = `Пользователь дал ГОТОВЫЙ ТЕКСТ. Преобразуй его в JSON-массив блоков.

ЖЁСТКИЕ ПРАВИЛА:
1. НЕ сокращай! Сохрани ВСЮ информацию из исходника.
2. Каждый абзац исходника → отдельный блок "text".
3. Заголовки типа "1. Название" → блок "section" с number и title.
4. Код → блок "code" с полем "code" (без markdown-обёртки).
5. Первый блок — heading level 1 (главный заголовок).
6. НЕ используй HTML-теги (<p>, <ul>, <li>).
7. Поле "id" НЕ добавляй.

${BLOCKS_SPEC}

ФОРМАТ ОТВЕТА: ТОЛЬКО JSON-массив. Первый символ [, последний ]. Без \`\`\`json, без пояснений.

${BLOCKS_EXAMPLE}

ТЕКСТ ДЛЯ КОНВЕРТАЦИИ:
${text}`;
        }

        const result = await callGigaChat({
            system,
            user,
            temperature: isTopic ? 0.5 : 0.1,
            maxTokens: 8000,
            model: MODEL_PRO,
        });

        const blocks = parseBlocksFromAI(result.content);
        res.json({ blocks });
    } catch (error) {
        console.error('Ошибка генерации:', error);
        if (error.statusCode === 429) {
            return res.status(429).json({ error: error.message });
        }
        res.status(500).json({ error: error.message || 'Ошибка при генерации лекции' });
    }
};

// ─────────────────────────────────────────────
// 3. reviewCode — быстрая проверка кода
// ─────────────────────────────────────────────
export const reviewCode = async (req, res) => {
    try {
        rateLimit(`ai:review:${req.user.id}`, 30, 60_000);

        const { code, language, taskDescription } = req.body;

        if (!code?.trim()) {
            return res.status(400).json({ error: 'Код не может быть пустым' });
        }

        const safeCode = code.slice(0, 10_000);
        const safeTask = (taskDescription || '').slice(0, 2_000);

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
Задача: ${safeTask || 'Написать корректный и рабочий код'}

Код студента:
${safeCode}`;

        const result = await callGigaChat({
            system,
            user,
            temperature: 0.2,
            maxTokens: 2000,
            model: MODEL_PRO,
        });

        const review = extractJson(result.content, false);

        if (!review) {
            return res.status(500).json({ error: 'Не удалось распарсить JSON-ответ от ИИ' });
        }

        res.json({ review });
    } catch (error) {
        console.error('Ошибка ревью кода:', error);
        if (error.statusCode === 429) {
            return res.status(429).json({ error: error.message });
        }
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
        rateLimit(`ai:submit:${req.user.id}`, 20, 60_000);

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

        const safeCode = code.slice(0, 10_000);

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
                    .join('\n')
                    .slice(0, 3_000) || taskDescription;
            } catch {
                taskDescription = lecture.content.slice(0, 3_000);
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
${safeCode}`;

        const result = await callGigaChat({
            system,
            user,
            temperature: 0.2,
            maxTokens: 2500,
            model: MODEL_PRO,
        });

        const review = extractJson(result.content, false);

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
        if (error.statusCode === 429) {
            return res.status(429).json({ error: error.message });
        }
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
        rateLimit(`ai:test:${req.user.id}`, 10, 60_000);

        const { topic, questionCount = 5 } = req.body;

        if (!topic?.trim()) {
            return res.status(400).json({ error: 'Тема не может быть пустой' });
        }

        const safeTopic = topic.slice(0, 500);
        const safeCount = Math.min(Math.max(parseInt(questionCount) || 5, 1), 15);

        const system = `Ты — генератор тестов. Отвечаешь ТОЛЬКО валидным JSON-массивом, без markdown, без HTML, без текста вокруг.`;

        const user = `Сгенерируй тест по теме: "${safeTopic}".
Количество вопросов: ${safeCount}.
Каждый вопрос должен иметь 4 варианта ответа и один правильный.

Формат ответа — ТОЛЬКО JSON-массив:
[
  {
    "question": "текст вопроса",
    "options": ["вариант A", "вариант B", "вариант C", "вариант D"],
    "correctIndex": 0
  }
]

Поле "id" НЕ добавляй — фронт добавит сам.`;

        const result = await callGigaChat({
            system,
            user,
            temperature: 0.3,
            maxTokens: 3000,
            model: MODEL_PRO,
        });

        const questions = extractJson(result.content, true) || [];

        const cleaned = questions.map(q => {
            const { id, ...rest } = q;
            return rest;
        });

        res.json({ questions: cleaned });
    } catch (error) {
        console.error('Ошибка генерации теста:', error);
        if (error.statusCode === 429) {
            return res.status(429).json({ error: error.message });
        }
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};
