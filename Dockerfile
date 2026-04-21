FROM node:20-alpine

# Устанавливаем openssl, так как он необходим для работы Prisma Engine в alpine
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

# 1. Копируем файлы манифеста
COPY package*.json ./

# 2. Устанавливаем ВСЕ зависимости
RUN npm install

# 3. Копируем ТОЛЬКО папку prisma (со схемой)
# Это важно сделать ДО копирования остального кода для кэширования
COPY prisma ./prisma/

# 4. Генерируем клиент.
# Мы используем флаг --no-engine, чтобы билд не зависел от бинарников на этапе сборки,
# либо просто подавляем проверку БД.
# Явно указываем путь к схеме
RUN npx prisma generate --schema ./prisma/schema.prisma
# 5. Копируем весь остальной код
COPY . .

EXPOSE 5000

# Запуск. Мы добавляем префикс npx, чтобы использовать локальный nodemon
CMD ["npx", "nodemon", "server.js"]