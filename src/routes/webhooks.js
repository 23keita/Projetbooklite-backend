import express from 'express';
import Order from '../models/Order.js';
import { sendOrderConfirmationEmail } from '../services/emailService.js';

const router = express.Router();

// Webhook de notification de paiement
router.post('/payment-notification', async (req, res) => {
  try {
    const { orderNumber, status, amount } = req.body;

    if (!orderNumber || !status) {
      return res.status(400).json({ message: 'Données manquantes' });
    }

    // Trouver la commande par numéro
    const order = await Order.findOne({ orderNumber }).populate([
      { path: 'user' },
      { path: 'items.product' }
    ]);

    if (!order) {
      return res.status(404).json({ message: 'Commande non trouvée' });
    }

    // Vérifier le montant si fourni
    if (amount && Math.abs(order.totalAmount - parseFloat(amount)) > 0.01) {
      console.warn(`Montant différent pour commande ${orderNumber}: attendu ${order.totalAmount}, reçu ${amount}`);
    }

    // Mettre à jour le statut selon la notification
    if (status === 'success' || status === 'completed' || status === 'paid') {
      order.status = 'confirmed';
      order.isPaid = true;
      
      await order.save();

      // Envoyer l'email de confirmation avec liens de téléchargement
      try {
        await sendOrderConfirmationEmail(order);
      } catch (emailError) {
        console.error('Erreur envoi email confirmation:', emailError);
        // Ne pas faire échouer le webhook pour un problème d'email
      }

      res.json({ 
        message: 'Commande confirmée et email envoyé',
        orderId: order._id 
      });

    } else if (status === 'failed' || status === 'cancelled') {
      order.status = 'cancelled';
      await order.save();
      
      res.json({ 
        message: 'Commande annulée',
        orderId: order._id 
      });

    } else {
      res.json({ 
        message: 'Statut non traité',
        status 
      });
    }

  } catch (error) {
    console.error('Erreur webhook paiement:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

export default router;