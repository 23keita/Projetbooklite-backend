import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import auth, { admin } from '../middleware/auth.js';

const router = express.Router();

// Configuration Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'booklite-products',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'zip', 'mp4', 'avi', 'mov'],
    resource_type: 'auto', // Permet tous types de fichiers
  },
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max
  },
});

// Route d'upload sécurisée
router.post('/', auth, admin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier fourni' });
    }

    const result = {
      url: req.file.path,
      public_id: req.file.filename,
      format: req.file.format || 'unknown',
      size: req.file.size,
      original_name: req.file.originalname,
    };

    res.json(result);
  } catch (error) {
    console.error('Erreur upload Cloudinary:', error);
    res.status(500).json({ message: 'Erreur lors de l\'upload' });
  }
});

export default router;