import express from 'express';
import googleDriveService from '../services/googleDrive.js';

const router = express.Router();

/**
 * Route pour générer un lien de téléchargement signé
 * POST /api/generate-link/:fileId
 */
router.post('/generate-link/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const { expiryDays = 7, maxDownloads = 3 } = req.body;

    const linkData = await googleDriveService.generateSignedDownloadLink(
      fileId,
      parseInt(expiryDays),
      parseInt(maxDownloads)
    );

    res.json({
      success: true,
      data: linkData
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Route de téléchargement sécurisée
 * GET /api/download/:token
 */
router.get('/download/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    const downloadData = await googleDriveService.processDownload(token);
    
    // Rediriger vers l'URL de téléchargement direct de Google Drive
    res.redirect(downloadData.directUrl);
    
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Route pour révoquer un lien
 * DELETE /api/revoke-link/:token
 */
router.delete('/revoke-link/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    const result = await googleDriveService.revokeLink(token);
    
    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
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

export default router;