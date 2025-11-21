import express from 'express';
import CourseOrder from '../models/CourseOrder.js';
import auth, { admin } from '../middleware/auth.js';

const router = express.Router();

// Créer une nouvelle commande de formation
router.post('/', auth, async (req, res) => {
  try {
    const { courseId, courseTitle, amount, currency = 'GNF' } = req.body;
    
    const courseOrder = new CourseOrder({
      user: req.user.id,
      courseId,
      courseTitle,
      amount,
      currency,
      type: 'course'
    });

    await courseOrder.save();
    res.status(201).json(courseOrder);
  } catch (error) {
    console.error('Erreur lors de la création de la commande:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Obtenir une commande spécifique
router.get('/:orderId', auth, async (req, res) => {
  try {
    const order = await CourseOrder.findOne({
      _id: req.params.orderId,
      user: req.user.id
    });

    if (!order) {
      return res.status(404).json({ message: 'Commande non trouvée' });
    }

    res.json(order);
  } catch (error) {
    console.error('Erreur lors de la récupération de la commande:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Obtenir les formations achetées par l'utilisateur
router.get('/my-courses', auth, async (req, res) => {
  try {
    const orders = await CourseOrder.find({
      user: req.user.id,
      type: 'course'
    }).sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    console.error('Erreur lors de la récupération des formations:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Admin: Obtenir toutes les commandes de formations
router.get('/admin/all', auth, admin, async (req, res) => {
  try {
    const orders = await CourseOrder.find({ type: 'course' })
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    console.error('Erreur lors de la récupération des commandes:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Admin: Confirmer une commande
router.patch('/admin/:orderId/confirm', auth, admin, async (req, res) => {
  try {
    const order = await CourseOrder.findByIdAndUpdate(
      req.params.orderId,
      { status: 'confirmed' },
      { new: true }
    ).populate('user', 'name email');

    if (!order) {
      return res.status(404).json({ message: 'Commande non trouvée' });
    }

    res.json(order);
  } catch (error) {
    console.error('Erreur lors de la confirmation de la commande:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Admin: Annuler une commande
router.patch('/admin/:orderId/cancel', auth, admin, async (req, res) => {
  try {
    const order = await CourseOrder.findByIdAndUpdate(
      req.params.orderId,
      { status: 'cancelled' },
      { new: true }
    ).populate('user', 'name email');

    if (!order) {
      return res.status(404).json({ message: 'Commande non trouvée' });
    }

    res.json(order);
  } catch (error) {
    console.error('Erreur lors de l\'annulation de la commande:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

export default router;