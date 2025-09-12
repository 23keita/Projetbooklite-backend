import Order from './models/Order.js';
import Product from './models/Product.js';

import googleDriveService from './services/googleDrive.js';
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
    const orders = await Order.find({ user: req.user.id })
      .populate('items.product')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
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

import Order from './models/Order.js';
import Product from './models/Product.js';
import googleDriveService from './services/googleDrive.js';
import PDFDocument from 'pdfkit';

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
      if (order.user.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Accès non autorisé' });
      }
      if (order.status !== 'paid') return res.status(400).json({ message: 'Order not paid' });
  
      const orderItem = order.items.find(item => item.product._id.toString() === req.params.productId);
      if (!orderItem || !orderItem.product.fileId) {
        return res.status(404).json({ message: 'Product file not found in this order' });
      }
  
      const downloadLink = await googleDriveService.generateSignedDownloadLink(orderItem.product.fileId, 7, 3);
      res.json(downloadLink);
    } catch (error) {
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