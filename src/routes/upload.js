import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import auth, { admin } from '../middleware/auth.js';

const router = express.Router();

// Configuration Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configuration Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'booklite-products',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
    resource_type: 'image',
  },
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
});

// Route d'upload sécurisée
router.post('/', auth, admin, upload.single('file'), async (req, res) => {
  try {
    console.log('Upload request received');
    console.log('User:', req.user);
    console.log('File:', req.file);
    
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

    console.log('Upload successful:', result);
    res.json(result);
  } catch (error) {
    console.error('Erreur upload Cloudinary:', error);
    res.status(500).json({ message: 'Erreur lors de l\'upload: ' + error.message });
  }
});

// Route de test
router.get('/test', auth, admin, (req, res) => {
  res.json({ message: 'Upload endpoint accessible', user: req.user?.email });
});

export default router;