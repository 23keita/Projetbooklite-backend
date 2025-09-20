import express from 'express';
import { v2 as cloudinary } from 'cloudinary';
import auth from '../middleware/auth.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';

const router = express.Router();

// Route de téléchargement sécurisée
router.get('/:orderId/download/:productId', auth, async (req, res) => {
  try {
    const { orderId, productId } = req.params;
    const userId = req.user.id;

    // Vérifier que la commande existe et appartient à l'utilisateur
    const order = await Order.findOne({ 
      _id: orderId, 
      user: userId 
    }).populate('items.product');

    if (!order) {
      return res.status(404).json({ message: 'Commande non trouvée' });
    }

    // Vérifier que la commande est payée et confirmée
    if (!order.isPaid || order.status !== 'confirmed') {
      return res.status(403).json({ 
        message: 'La commande doit être payée et confirmée pour télécharger' 
      });
    }

    // Vérifier que le produit fait partie de la commande
    const orderItem = order.items.find(item => 
      item.product._id.toString() === productId
    );

    if (!orderItem) {
      return res.status(404).json({ 
        message: 'Produit non trouvé dans cette commande' 
      });
    }

    const product = await Product.findById(productId);
    if (!product || !product.files || product.files.length === 0) {
      return res.status(404).json({ 
        message: 'Aucun fichier disponible pour ce produit' 
      });
    }

    // Pour l'instant, on retourne le premier fichier
    // TODO: Permettre de spécifier quel fichier télécharger
    const file = product.files[0];
    
    // Générer une URL de téléchargement sécurisée Cloudinary
    const downloadUrl = cloudinary.url(file.publicId, {
      resource_type: 'auto',
      type: 'upload',
      sign_url: true,
      expires_at: Math.floor(Date.now() / 1000) + 3600, // Expire dans 1 heure
    });

    // Rediriger vers l'URL Cloudinary ou retourner les informations
    if (req.query.redirect === 'true') {
      return res.redirect(downloadUrl);
    }

    res.json({
      downloadUrl,
      fileName: file.fileName || file.originalName || 'download',
      size: file.size,
      format: file.format,
    });

  } catch (error) {
    console.error('Erreur téléchargement:', error);
    res.status(500).json({ message: 'Erreur lors du téléchargement' });
  }
});

export default router;