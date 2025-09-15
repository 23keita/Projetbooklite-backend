import express from 'express';
import Product from '../models/Product.js';
import { auth, admin } from '../middleware/auth.js';
import { uploadFields } from '../utils/multerConfig.js';
import googleDriveService from '../services/googleDrive.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, category, search } = req.query;
    const query = { isActive: true };
    
    if (category) query.category = category;

    if (search) {
      // Sécurité : Échapper les caractères spéciaux pour prévenir les attaques ReDoS
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { title: { $regex: escapedSearch, $options: 'i' } },
        { author: { $regex: escapedSearch, $options: 'i' } }
      ];
    }

    const products = await Product.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Product.countDocuments(query);
    
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', auth, admin, uploadFields, async (req, res) => {
  try {
    const productData = { ...req.body };
    
    // Gérer l'image
    if (req.files?.image?.[0]) {
      const imageFile = req.files.image[0];
      try {
        const { Readable } = await import('stream');
        const stream = Readable.from(imageFile.buffer);
        const driveResult = await googleDriveService.uploadPublicFile(
          stream,
          imageFile.originalname,
          imageFile.mimetype
        );
        // Correction pour obtenir une URL directe de l'image
        productData.image = driveResult.webViewLink.replace("view", "preview");
      } catch (driveError) {
        throw new Error(`Erreur upload image: ${driveError.message}`);
      }
    } else {
      productData.image = 'https://via.placeholder.com/300x200';
    }
    
    // Gérer le fichier produit et l'uploader vers Google Drive
    if (req.files?.productFile?.[0]) {
      const productFile = req.files.productFile[0];
      
      try {
        // Uploader vers Google Drive directement depuis le buffer
        const { Readable } = await import('stream');
        const stream = Readable.from(productFile.buffer);

        const driveResult = await googleDriveService.uploadFile(
          stream,
          productFile.originalname,
          productFile.mimetype
        );
        
        productData.fileId = driveResult.fileId;
        productData.fileName = driveResult.name;
        
      } catch (driveError) {
        throw new Error(`Erreur upload Google Drive: ${driveError.message}`);
      }
    }
    
    const product = new Product(productData);
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

router.put('/:id', auth, admin, uploadFields, async (req, res) => {
  try {
    const updateData = { ...req.body };
    
    // Gérer la nouvelle image si elle est fournie
    if (req.files?.image?.[0]) {
      const imageFile = req.files.image[0];
      try {
        const { Readable } = await import('stream');
        const stream = Readable.from(imageFile.buffer);
        const driveResult = await googleDriveService.uploadPublicFile(
          stream,
          imageFile.originalname,
          imageFile.mimetype
        );
        updateData.image = driveResult.webViewLink.replace("view", "preview");
      } catch (driveError) {
        throw new Error(`Erreur upload image: ${driveError.message}`);
      }
    }
    
    const product = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

router.delete('/:id', auth, admin, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { isActive: false });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Attache des fichiers locaux (uploadés) à un produit (pack)
 * POST /api/products/:id/files
 * body: { fileIds: string[] } // IDs internes (File.fileId)
 */
router.post('/:id/files', auth, admin, async (req, res) => {
  try {
    const { fileIds } = req.body;
    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ message: 'fileIds requis' });
    }

    const { default: File } = await import('../models/File1.js');
    const { default: DownloadLink } = await import('../models/DownloadLink.js');

    const filesMeta = [];
    const tokenRegex = /^[a-f0-9]{64}$/i;
    for (const raw of fileIds) {
      const input = String(raw || '').trim();
      if (!input) {
        return res.status(400).json({ message: 'Entrée vide dans fileIds' });
      }

      let resolvedFileId = input;

      // Si c'est une URL /api/download/:token, extraire le token
      try {
        let url;
        try { url = new URL(input); } catch {}
        if (url) {
          const m = url.pathname.match(/\/api\/download\/([a-f0-9]{64})/i);
          if (m && m[1]) {
            const token = m[1];
            const link = await DownloadLink.findOne({ token }).lean();
            if (!link) {
              return res.status(400).json({ message: `Lien de téléchargement inconnu: ${input}` });
            }
            resolvedFileId = link.fileId;
          }
        } else if (tokenRegex.test(input)) {
          // Si c'est un token brut (64 hex)
          const link = await DownloadLink.findOne({ token: input }).lean();
          if (!link) {
            return res.status(400).json({ message: `Token inconnu: ${input}` });
          }
          resolvedFileId = link.fileId;
        }
      } catch (e) {
        // continue with input as is if URL parsing fails
      }

      // À ce stade, resolvedFileId doit être un File.fileId local
      const doc = await File.findOne({ fileId: resolvedFileId });
      if (!doc) {
        return res.status(400).json({ message: `Fichier local introuvable pour: ${input}. Importez d'abord le fichier en local.` });
      }

      filesMeta.push({
        fileId: doc.fileId,
        fileName: doc.name,
      });
    }

    // Éviter les doublons: filtrer ceux déjà présents
    const existing = await Product.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ message: 'Product not found' });
    const existingIds = new Set((existing.files || []).map(f => f.fileId));
    const toAdd = filesMeta.filter(f => !existingIds.has(f.fileId));
    if (toAdd.length === 0) {
      const fresh = await Product.findById(req.params.id);
      return res.json(fresh);
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $push: { files: { $each: toAdd } } },
      { new: true }
    );

    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (error) {
    console.error('Attach files error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Détache un fichier Google Drive d'un produit
 * DELETE /api/products/:id/files/:fileId
 */
router.delete('/:id/files/:fileId', auth, admin, async (req, res) => {
  try {
    const { id, fileId } = req.params;
    const product = await Product.findByIdAndUpdate(
      id,
      { $pull: { files: { fileId } } },
      { new: true }
    );
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;