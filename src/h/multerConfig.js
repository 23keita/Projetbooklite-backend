import multer from 'multer';
import path from 'path';

// Configuration pour les images
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/images/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Configuration pour les fichiers produits
const productFileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/products/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadFields = multer({
  storage: multer.memoryStorage(), // Utiliser la mémoire pour traiter les fichiers
  limits: { 
    fileSize: 50 * 1024 * 1024, // 50MB max
    files: 2 // Max 2 fichiers (image + produit)
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'image') {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Seules les images sont autorisées pour le champ image'));
      }
    } else if (file.fieldname === 'productFile') {
      const allowedTypes = [
        'application/pdf',
        'application/zip',
        'application/x-zip-compressed',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Type de fichier non autorisé pour le produit'));
      }
    } else {
      cb(new Error('Champ de fichier non reconnu'));
    }
  }
}).fields([
  { name: 'image', maxCount: 1 },
  { name: 'productFile', maxCount: 1 }
]);

export { uploadFields };