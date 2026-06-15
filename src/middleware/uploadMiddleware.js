import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Настройка хранилища
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let folder = 'uploads/';

        if (file.fieldname === 'avatar') folder += 'avatars/';
        else if (file.fieldname === 'banner') folder += 'banners/';
        else if (file.fieldname === 'document') folder += 'documents/';
        else folder += 'misc/';

        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder, { recursive: true });
        }
        cb(null, folder);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// Фильтр файлов
const fileFilter = (req, file, cb) => {
    const allowedImageTypes = /jpeg|jpg|png|webp|gif/;
    const allowedDocTypes = /pdf|doc|docx|zip|rar|txt/;

    const mimetype = allowedImageTypes.test(file.mimetype) || allowedDocTypes.test(file.mimetype);
    const extname = allowedImageTypes.test(path.extname(file.originalname).toLowerCase()) ||
        allowedDocTypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
        return cb(null, true);
    }
    cb(new Error('Ошибка: Данный тип файла не поддерживается!'));
};

export const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // Лимит 10MB
    fileFilter: fileFilter
});