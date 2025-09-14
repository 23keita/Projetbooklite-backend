import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { auth, admin } from '../middleware/auth.js';
import File from '../models/File1.js';

const router = express.Router();

// Ensure destination directory exists
const FILES_DIR = path.join('uploads', 'files');
if (!fs.existsSync(FILES_DIR)) {
  fs.mkdirSync(FILES_DIR, { recursive: true });
}

// Configure multer storage for generic files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, FILES_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `file-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB max
  fileFilter: (req, file, cb) => {
    // Allow only .zip files
    const allowedMimes = new Set([
      'application/zip',
      'application/x-zip-compressed',
      'multipart/x-zip',
      'application/octet-stream', // some browsers label zip like this; we'll check extension too
    ]);
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (ext === '.zip' && allowedMimes.has((file.mimetype || '').toLowerCase())) {
      return cb(null, true);
    }
    if (ext === '.zip' && (file.mimetype || '').toLowerCase() === '') {
      // In rare cases mimetype missing; still allow by extension
      return cb(null, true);
    }
    return cb(new Error('Seuls les fichiers ZIP (.zip) sont acceptés'));
  }
});

/**
 * Create (upload) a file and register it in DB
 * POST /api/files
 * form-data: file (required)
 * returns: { success, data: { fileId, name, path } }
 */
router.post('/', auth, admin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Aucun fichier fourni (champ "file")' });
    }

    // Generate a unique fileId
    const fileId = (crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex'));

    // Store relative path from uploads/ root so download resolver can work
    const relativePath = path.join('files', req.file.filename);

    const doc = await File.create({
      fileId,
      name: req.file.originalname,
      path: relativePath
    });

    return res.status(201).json({ success: true, data: doc });
  } catch (err) {
    console.error('File upload error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Erreur serveur' });
  }
});

/**
 * List all uploaded files (dashboard)
 * GET /api/files
 */
router.get('/', auth, admin, async (req, res) => {
  try {
    const files = await File.find({}).sort({ _id: -1 }).lean();
    res.json({ success: true, data: files });
  } catch (err) {
    console.error('List files error:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

export default router;
