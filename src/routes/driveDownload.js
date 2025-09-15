import express from 'express';
import googleDriveService from '../services/googleDrive.js';
import { auth, admin } from '../middleware/auth.js';
import DownloadLink from '../models/DownloadLink.js';
import crypto from 'crypto';

const router = express.Router();

/**
 * Route pour générer un lien de téléchargement signé
 * POST /api/generate-link/:fileId
 */
router.post('/generate-link/:fileId', auth, admin, async (req, res) => {
  try {
    const { fileId } = req.params;
    const expiryDays = parseInt(req.body?.expiryDays ?? process.env.DOWNLOAD_EXPIRY_DAYS ?? '7', 10);
    const maxDownloads = parseInt(req.body?.maxDownloads ?? process.env.MAX_DOWNLOADS ?? '3', 10);

    // Try to find a local File first (uploaded via dashboard)
    const { default: File } = await import('../models/File.js');
    let resolvedName = null;

    const localDoc = await File.findOne({ fileId });
    if (localDoc) {
      resolvedName = localDoc.name;
    } else {
      // Fallback to Google Drive metadata for legacy/Drive files
      const driveMeta = await googleDriveService.drive.files.get({ fileId, fields: 'id,name' });
      resolvedName = driveMeta.data.name;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    await DownloadLink.create({
      token,
      fileId,
      fileName: resolvedName,
      maxDownloads,
      downloadCount: 0,
      expiresAt,
      revoked: false,
    });

    res.json({
      success: true,
      data: {
        token,
        fileId,
        fileName: resolvedName,
        downloadUrl: `${process.env.BASE_URL || 'http://localhost:5000'}/api/download/${token}`,
        expires: expiresAt.toISOString(),
        maxDownloads,
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * Route de téléchargement sécurisée
 * GET /api/download/:token
 */
router.get('/download/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const link = await DownloadLink.findOne({ token });
    if (!link) return res.status(404).json({ success: false, message: 'Lien invalide ou expiré' });
    if (link.revoked) return res.status(403).json({ success: false, message: 'Lien révoqué' });
    if (new Date() > new Date(link.expiresAt)) return res.status(410).json({ success: false, message: 'Lien expiré' });
    if (link.downloadCount >= link.maxDownloads) return res.status(429).json({ success: false, message: 'Limite de téléchargements atteinte' });
    
    // Incrémente le compteur avant envoi
    link.downloadCount += 1;
    await link.save();
    
    // --- Logique unifiée pour servir un fichier local OU un fichier Google Drive ---
    
    // Étape 1: Essayer de trouver un fichier local correspondant
    const { default: File } = await import('../models/File1.js');
    const fileDoc = await File.findOne({ fileId: link.fileId });
    
    if (fileDoc) {
      // C'est un fichier local, on le sert directement
      const pathMod = await import('path');
      const fs = await import('fs');
      const uploadsRoot = pathMod.resolve(process.cwd(), 'uploads');
      const absolutePath = pathMod.isAbsolute(fileDoc.path)
        ? fileDoc.path
        : pathMod.resolve(uploadsRoot, fileDoc.path);
      
      // Sécurité: s'assurer que le fichier est bien sous uploads/
      const normalized = pathMod.resolve(absolutePath);
      if (!normalized.startsWith(uploadsRoot)) {
        return res.status(400).json({ success: false, message: 'Chemin de fichier non autorisé' });
      }
      if (!fs.existsSync(normalized)) {
        return res.status(404).json({ success: false, message: 'Fichier manquant sur le serveur' });
      }
      
      const filename = link.fileName || fileDoc.name || 'download.bin';
      return res.download(normalized, filename);
    } else {
      // C'est probablement un fichier Google Drive, on le streame
      const filename = link.fileName || 'download.bin';
      
      // Indiquer au navigateur que c'est un fichier à télécharger
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      const driveStream = await googleDriveService.drive.files.get(
        { fileId: link.fileId, alt: 'media' },
        { responseType: 'stream' }
      );
      
      // Streamer le fichier de Google Drive vers le client
      driveStream.data.pipe(res);
    }
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return res.status(404).json({ success: false, message: `Fichier introuvable sur le serveur ou sur Google Drive pour fileId=${req.params.token}` });
    }
    return res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * Route pour révoquer un lien
 * DELETE /api/revoke-link/:token
 */
router.delete('/revoke-link/:token', auth, admin, async (req, res) => {
  try {
    const { token } = req.params;
    const link = await DownloadLink.findOne({ token });
    if (!link) return res.status(404).json({ success: false, message: 'Lien non trouvé' });
    if (link.revoked) return res.json({ success: true, message: 'Déjà révoqué' });
    link.revoked = true;
    await link.save();
    res.json({ success: true, message: 'Lien révoqué avec succès' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * Route pour uploader un fichier produit
 * POST /api/upload-product
 */
router.post('/upload-product', async (req, res) => {
  try {
    // Ici vous utiliseriez multer pour gérer l'upload
    const { fileName, mimeType } = req.body;
    const filePath = req.file?.path; // Chemin du fichier uploadé
    
    if (!filePath) {
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier fourni'
      });
    }

    const uploadResult = await googleDriveService.uploadFile(
      filePath,
      fileName,
      mimeType
    );

    res.json({
      success: true,
      data: uploadResult
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Liste les fichiers dans le dossier configuré (admin)
 * GET /api/files
 */
router.get('/files', auth, admin, async (req, res) => {
  try {
    const files = await googleDriveService.listFilesInFolder();
    res.json({ success: true, data: files });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * Vérifie l'accès à un fichier Drive spécifique (admin)
 * GET /api/files/:fileId/check
 */
router.get('/files/:fileId/check', auth, admin, async (req, res) => {
  try {
    const { fileId } = req.params;
    const idPattern = /^[A-Za-z0-9_-]{10,}$/;
    if (!idPattern.test(fileId)) {
      return res.status(400).json({ success: false, message: `Identifiant Google Drive invalide: ${fileId}` });
    }

    const file = await googleDriveService.drive.files.get({ fileId, fields: 'id,name,mimeType,size,owners(displayName,emailAddress)' });
    return res.json({ success: true, data: {
      id: file.data.id,
      name: file.data.name,
      mimeType: file.data.mimeType,
      size: file.data.size,
      owners: file.data.owners
    }});
  } catch (e) {
    const status = e?.response?.status;
    const reason = e?.response?.data?.error?.errors?.[0]?.reason || e?.response?.data?.error?.status;
    const svcEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 'service account';
    if (status === 404 || reason === 'notFound') {
      return res.status(400).json({ success: false, message: `Fichier introuvable ou non accessible: ${req.params.fileId}. Vérifiez que l'ID est correct et que le fichier/dossier est partagé avec ${svcEmail}.` });
    }
    if (status === 403 || reason === 'forbidden') {
      return res.status(400).json({ success: false, message: `Accès interdit au fichier: ${req.params.fileId}. Partagez le fichier avec ${svcEmail} (Lecteur) ou placez-le dans un dossier auquel ce compte a accès.` });
    }
    console.error('Erreur Google Drive lors de la vérification du fichier:', e?.message || e);
    return res.status(502).json({ success: false, message: `Erreur Google Drive lors de la vérification du fichier ${req.params.fileId}.` });
  }
});

/**
 * Liste les liens temporaires actifs (admin)
 * GET /api/links
 */
router.get('/links', auth, admin, async (req, res) => {
  const links = await DownloadLink.find({}).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: links });
});

/**
 * Réinitialise le compteur d'un lien (admin)
 * POST /api/links/:token/reset
 */
router.post('/links/:token/reset', auth, admin, async (req, res) => {
  const { token } = req.params;
  const link = await DownloadLink.findOne({ token });
  if (!link) return res.status(404).json({ success: false, message: 'Lien non trouvé' });
  link.downloadCount = 0;
  await link.save();
  res.json({ success: true, message: 'Compteur réinitialisé' });
});

export default router;