import express from 'express';
import Product from '../models/Product.js';

const router = express.Router();

// Route de téléchargement
router.get('/:productId/download/:fileId?', async (req, res) => {
    try {
        const { productId, fileId } = req.params;

        // Vérifier que le produit existe
        const productDoc = await Product.findById(productId);
        if (!productDoc) {
            return res.status(404).json({ success: false, message: 'Produit non trouvé' });
        }

        let file;

        if (fileId) {
            // Si un fileId est fourni → chercher dans le tableau files[]
            file = productDoc.files.find(f => f.fileId === fileId);
            if (!file) {
                return res.status(404).json({ success: false, message: 'Fichier introuvable pour ce produit' });
            }
        } else if (productDoc.fileId) {
            // Compatibilité legacy → utiliser le champ fileId
            file = {
                fileId: productDoc.fileId,
                fileName: productDoc.fileName || 'fichier.zip',
            };
        } else {
            return res.status(400).json({ success: false, message: 'Aucun fichier associé à ce produit' });
        }

        // Générer une URL de téléchargement (ex : ton domaine ou Google Drive)
        const downloadUrl = `https://drive.google.com/uc?export=download&id=${file.fileId}`;

        res.json({
            success: true,
            product: productDoc.title,
            file: file.fileName,
            downloadUrl,
        });

    } catch (error) {
        console.error('Erreur téléchargement fichier:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

export default router;