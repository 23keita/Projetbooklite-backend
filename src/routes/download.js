import express from 'express';
import Product from '../models/Product.js';

const router = express.Router();

// Route de téléchargement (sans authentification)
router.get('/', async (req, res) => {
  try {
    const { product } = req.query;
    
    if (!product) {
      return res.status(400).json({ message: 'ID produit manquant' });
    }
    
    // Vérifier que le produit existe
    const productDoc = await Product.findById(product);
    if (!productDoc) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }
    
    // Simuler le téléchargement (en réalité, on servirait le fichier)
    res.json({
      message: 'Téléchargement autorisé',
      product: productDoc.title,
      downloadUrl: `https://files.booklite.com/${productDoc._id}.zip`,
    });
    
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

export default router;