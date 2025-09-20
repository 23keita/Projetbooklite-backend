import { Router } from 'express';

import { verifyToken } from '../middlewares/auth';

const router = Router();

// Upload fichiers (images, zip, vidéos) vers Cloudinary
router.post('/', verifyToken, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'Aucun fichier envoyé' });
        res.json({
            success: true,
            data: {
                path: req.file.path,
                filename: req.file.filename,
                originalname: req.file.originalname,
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Erreur lors de l\'upload' });
    }
});

export default router;
