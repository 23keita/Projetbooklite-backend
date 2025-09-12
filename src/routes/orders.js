import express from 'express';
import { auth, admin } from '../middleware/auth.js';
import {
  createOrder,
  getMyOrders,
  getOrderById,
  createPaymentIntent,
  getDownloadLinkForProduct,
  getAllOrders,
  updateOrderStatus,
  sendDeliveryEmail,
  deleteOrder,
  generateReceiptPDF
} from '../order.controller.js';

const router = express.Router();

// --- Routes pour les utilisateurs authentifiés ---
router.post('/', auth, createOrder);
router.get('/', auth, getMyOrders); // Le frontend appelle GET /api/orders pour les commandes de l'utilisateur
router.get('/:id', auth, getOrderById);
router.post('/:id/payment', auth, createPaymentIntent);
router.get('/:id/download/:productId', auth, getDownloadLinkForProduct);

// --- Routes pour les administrateurs ---
// Note: Le frontend utilise /api/dashboard/orders pour lister toutes les commandes,
// donc une route GET /all ici pourrait être redondante si non utilisée.
// Je la laisse commentée pour référence.
// router.get('/all', auth, admin, getAllOrders);

router.put('/:id/status', auth, admin, updateOrderStatus);
router.post('/:id/delivery', auth, admin, sendDeliveryEmail);
router.delete('/:id', auth, admin, deleteOrder);
router.get('/:id/receipt', auth, generateReceiptPDF);

export default router;