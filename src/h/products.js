import express from 'express';
import Product from '../models/Product.js';
import { auth, admin } from '../middleware/auth.js';
import { upload } from '../utils/s3.js';
import { uploadFields } from '../utils/multerConfig.js';
import googleDriveService from '../services/googleDrive.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, category, search } = req.query;
    const query = { isActive: true };
    
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } }
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
      const imagePath = path.join('uploads/images', `${Date.now()}-${imageFile.originalname}`);
      fs.writeFileSync(imagePath, imageFile.buffer);
      productData.image = `/${imagePath}`;
    } else {
      productData.image = 'https://via.placeholder.com/300x200';
    }
    
    // Gérer le fichier produit et l'uploader vers Google Drive
    if (req.files?.productFile?.[0]) {
      const productFile = req.files.productFile[0];
      
      // Sauvegarder temporairement le fichier
      const tempPath = path.join('uploads/products', `temp-${Date.now()}-${productFile.originalname}`);
      fs.writeFileSync(tempPath, productFile.buffer);
      
      try {
        // Uploader vers Google Drive
        const driveResult = await googleDriveService.uploadFile(
          fs.createReadStream(tempPath),
          productFile.originalname,
          productFile.mimetype
        );
        
        productData.fileId = driveResult.fileId;
        productData.fileName = driveResult.name;
        
        // Supprimer le fichier temporaire
        fs.unlinkSync(tempPath);
      } catch (driveError) {
        // Supprimer le fichier temporaire en cas d'erreur
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
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

router.put('/:id', auth, admin, upload.single('image'), async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (req.file) {
      updateData.image = `/uploads/${req.file.filename}`;
    }
    
    const product = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
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

export default router;