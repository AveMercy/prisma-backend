// Простой in-memory rate limiter для защиты от зацикливаний и abuse.
// Работает для одного инстанса бэкенда (для диплома достаточно).

const buckets = new Map();

/**
 * Проверяет лимит запросов.
 * @param {string} key — уникальный ключ (например, `ai:${userId}`)
 * @param {number} maxRequests — максимум запросов в окне
 * @param {number} windowMs — размер окна в миллисекундах
 * @throws {Error} если лимит превышен
 */
export function rateLimit(key, maxRequests, windowMs) {
    const now = Date.now();
    let bucket = buckets.get(key);

    if (!bucket || now > bucket.resetAt) {
        bucket = { count: 0, resetAt: now + windowMs };
        buckets.set(key, bucket);
    }

    bucket.count++;

    if (bucket.count > maxRequests) {
        const seconds = Math.ceil((bucket.resetAt - now) / 1000);
        const error = new Error(`Слишком много запросов. Подождите ${seconds} сек.`);
        error.statusCode = 429;
        throw error;
    }
}

/**
 * Возвращает текущее состояние bucket'а (для отладки).
 */
export function getRateLimitStatus(key) {
    return buckets.get(key) || null;
}

// Автоочистка старых bucket'ов каждую минуту
setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
        if (now > bucket.resetAt) buckets.delete(key);
    }
}, 60_000).unref();  // unref — не держит процесс живым
