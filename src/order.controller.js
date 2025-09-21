import Order from './models/Order.js';
import Product from './models/Product.js';

import googleDriveService from './services/googleDrive.js';
import DownloadLink from './models/DownloadLink.js';
import PDFDocument from 'pdfkit';

/**
 * Crée une nouvelle commande pour l'utilisateur authentifié.
 */
export const createOrder = async (req, res) => {
  const { items, shippingAddress } = req.body;
  const userId = req.user.id;

  try {
    const productIds = items.map(item => item.productId);
    const products = await Product.find({ '_id': { $in: productIds } });

    if (products.length !== items.length) {
      return res.status(400).json({ message: "Certains produits de votre commande n'existent pas." });
    }

    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const product = products.find(p => p._id.toString() === item.productId);
      if (!product) {
        return res.status(404).json({ message: `Produit introuvable: ${item.productId}` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({ message: `Stock insuffisant pour ${product.title}` });
      }
      totalAmount += product.price * item.quantity;
      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price,
      });
    }

    const newOrder = new Order({
      user: userId,
      items: orderItems,
      totalAmount,
      status: 'pending',
      shippingAddress,
    });

    await newOrder.save();
    const populatedOrder = await Order.findById(newOrder._id).populate('items.product').populate('user', 'name email');

    res.status(201).json(populatedOrder);
  } catch (error) {
    console.error('Erreur création commande:', error);
    res.status(500).json({ message: error.message || 'Erreur serveur lors de la création de la commande' });
  }
};

/**
 * Récupère les commandes de l'utilisateur authentifié.
 */
export const getMyOrders = async (req, res) => {
  try {
    console.log('Getting orders for user:', req.user.id);
    const orders = await Order.find({ user: req.user.id })
      .populate('items.product')
      .sort({ createdAt: -1 });
    console.log('Found orders:', orders.length);
    res.json(orders);
  } catch (error) {
    console.error('Error in getMyOrders:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

/**
 * Récupère une commande par son ID, avec vérification des droits.
 */
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('items.product').populate('user', 'name email');
    if (!order) {
      return res.status(404).json({ message: 'Commande non trouvée' });
    }
    if (order.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Simule un paiement et met à jour la commande en "paid".
 * - Vérifie que l'utilisateur est propriétaire ou admin
 * - Vérifie le stock des produits
 * - Décrémente le stock et marque la commande comme payée
 */
export const createPaymentIntent = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('items.product');
    if (!order) {
      return res.status(404).json({ message: 'Commande non trouvée' });
    }
    // Vérification des droits
    const isOwner = order.user.toString ? order.user.toString() === req.user.id : (order.user._id && order.user._id.toString() === req.user.id);
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }
    if (order.status === 'paid') {
      return res.status(400).json({ message: 'Cette commande est déjà payée' });
    }

    // Vérifier le stock
    for (const item of order.items) {
      if (!item.product) {
        return res.status(400).json({ message: 'Produit manquant dans la commande' });
      }
      if (item.product.stock < item.quantity) {
        return res.status(400).json({ message: `Stock insuffisant pour ${item.product.title}` });
      }
    }

    // Décrémenter le stock
    for (const item of order.items) {
      const product = await Product.findById(item.product._id);
      if (!product) continue;
      product.stock = Math.max(0, (product.stock || 0) - item.quantity);
      await product.save();
    }

    // Marquer la commande comme payée
    order.status = 'paid';
    await order.save();

    const updated = await Order.findById(order._id)
      .populate('items.product')
      .populate('user', 'name email');

    return res.json({ message: 'Paiement simulé avec succès', order: updated });
  } catch (error) {
    console.error('Erreur paiement commande:', error);
    res.status(500).json({ message: 'Erreur serveur lors du paiement' });
  }
};

/**
 * Génère un reçu PDF pour une commande.
 */
export const generateReceiptPDF = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email')
      .populate('items.product');

    if (!order) {
      return res.status(404).json({ message: 'Commande non trouvée' });
    }

    // Vérification des droits : l'utilisateur doit être le propriétaire ou un admin
    if (order.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    // Définir les en-têtes pour le téléchargement du PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="recu-${order._id}.pdf"`);

    // Envoyer le PDF directement dans la réponse
    doc.pipe(res);

    // --- Contenu du PDF ---

    // En-tête
    doc.fontSize(20).text('Booklite SARL', { align: 'center' });
    doc.fontSize(10).text('Reçu de paiement digital', { align: 'center' });
    doc.moveDown(2);

    // Informations sur la commande
    doc.fontSize(12).text(`N° de Commande: ${order._id}`);
    doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString('fr-FR')}`);
    doc.text(`Client: ${order.user.name} (${order.user.email})`);
    doc.text(`Statut: ${order.status === 'paid' ? 'Payée' : 'Non Payée'}`);
    doc.moveDown(2);

    // En-tête du tableau des articles
    const tableTop = doc.y;
    doc.font('Helvetica-Bold');
    doc.text('Produit', 50, tableTop, { width: 280 });
    doc.text('Qté', 330, tableTop, { width: 50, align: 'center' });
    doc.text('Prix Unitaire', 380, tableTop, { width: 100, align: 'right' });
    doc.text('Total', 480, tableTop, { width: 70, align: 'right' });
    doc.font('Helvetica');
    doc.moveDown();

    // Lignes du tableau
    order.items.forEach(item => {
      const rowY = doc.y;
      doc.text(item.product.title, 50, rowY, { width: 280 });
      doc.text(item.quantity.toString(), 330, rowY, { width: 50, align: 'center' });
      doc.text(`${item.price.toFixed(2)} €`, 380, rowY, { width: 100, align: 'right' });
      doc.text(`${(item.price * item.quantity).toFixed(2)} €`, 480, rowY, { width: 70, align: 'right' });
      doc.moveDown();
    });

    // Total
    doc.moveDown();
    doc.font('Helvetica-Bold').fontSize(14).text(`Total Commande: ${order.totalAmount.toFixed(2)} €`, { align: 'right' });

    // Finaliser le PDF
    doc.end();
  } catch (error) {
    console.error('Erreur lors de la génération du reçu PDF:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la génération du reçu.' });
  }
};

/**
 * Génère un lien de téléchargement pour un produit d'une commande payée.
 */
export const getDownloadLinkForProduct = async (req, res) => {
    try {
      const order = await Order.findById(req.params.id).populate('items.product');
      if (!order) return res.status(404).json({ message: 'Order not found' });

      // Vérifier droits (propriétaire ou admin). Gestion robuste pour ObjectId ou objet populé
      const isOwner = order.user && (typeof order.user.toString === 'function'
        ? order.user.toString() === req.user.id
        : (order.user._id && order.user._id.toString() === req.user.id));
      if (!isOwner && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Accès non autorisé' });
      }

      if (order.status !== 'paid') return res.status(400).json({ message: 'Order not paid' });
  
      const orderItem = order.items.find(item => item.product && item.product._id && item.product._id.toString() === req.params.productId);
      if (!orderItem) {
        return res.status(404).json({ message: 'Product not found in this order' });
      }

      const expiryDays = parseInt(process.env.DOWNLOAD_EXPIRY_DAYS || '7', 10);
      const maxDownloads = parseInt(process.env.MAX_DOWNLOADS || '3', 10);

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiryDays);

      // Cas 1: nouveau modèle avec plusieurs fichiers attachés
      const files = Array.isArray(orderItem.product.files) ? orderItem.product.files : [];
      if (files.length > 0) {
        const cryptoMod = await import('crypto');
        const entries = [];
        for (const f of files) {
          const token = cryptoMod.randomBytes(32).toString('hex');
          entries.push({
            token,
            fileId: f.fileId,
            fileName: f.fileName || orderItem.product.title,
            productId: orderItem.product._id,
            userId: req.user.id,
            maxDownloads,
            downloadCount: 0,
            expiresAt,
            revoked: false,
          });
        }
        await DownloadLink.insertMany(entries);
        const base = process.env.BASE_URL || 'http://localhost:5000';
        const downloads = entries.map(e => ({
          fileId: e.fileId,
          fileName: e.fileName,
          downloadUrl: `${base}/api/download/${e.token}`,
          expires: expiresAt.toISOString(),
          maxDownloads,
        }));
        return res.json({ downloads });
      }

      // Cas 2: compatibilité legacy (un seul fichier)
      if (!orderItem.product.fileId) {
        return res.status(404).json({ message: 'Product file not found in this order' });
      }

      const cryptoMod = await import('crypto');
      const token = cryptoMod.randomBytes(32).toString('hex');

      await DownloadLink.create({
        token,
        fileId: orderItem.product.fileId,
        fileName: orderItem.product.fileName || orderItem.product.title,
        productId: orderItem.product._id,
        userId: req.user.id,
        maxDownloads,
        downloadCount: 0,
        expiresAt,
        revoked: false,
      });

      res.json({
        downloadUrl: `${process.env.BASE_URL || 'http://localhost:5000'}/api/download/${token}`,
        expires: expiresAt.toISOString(),
        maxDownloads
      });
    } catch (error) {
      console.error('Erreur génération lien de téléchargement:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };

/**
 * Récupère toutes les commandes (Admin).
 */
export const getAllOrders = async (req, res) => {
    try {
      const orders = await Order.find({})
        .populate('user', 'name email')
        .populate('items.product')
        .sort({ createdAt: -1 });
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Met à jour le statut d'une commande (Admin).
 */
export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Simule l'envoi d'un email de livraison (Admin).
 */
export const sendDeliveryEmail = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('items.product');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    
    console.log(`Sending delivery email for order ${order._id}`);
    res.json({ message: 'Delivery email sent successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Supprime une commande (Admin).
 */
export const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};