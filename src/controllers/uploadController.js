export const uploadFile = (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Файл не загружен' });
        }

        // Формируем путь для сохранения в БД
        const filePath = `/${req.file.path.replace(/\\/g, '/')}`;

        res.status(201).json({
            message: 'Файл успешно загружен',
            url: filePath
        });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка при обработке файла' });
    }
};

export const uploadMultipleFiles = (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'Файлы не загружены' });
        }

        const filePaths = req.files.map(file => `/${file.path.replace(/\\/g, '/')}`);

        res.status(201).json({
            message: 'Файлы успешно загружены',
            urls: filePaths
        });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка при обработке файлов' });
    }
};