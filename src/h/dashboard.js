import express from 'express';
import { auth, admin } from '../middleware/auth.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';

const router = express.Router();

// Toutes les routes du dashboard sont protégées et réservées aux administrateurs
router.use(auth, admin);

router.get('/stats', async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const totalProducts = await Product.countDocuments({ isActive: true });
    const totalUsers = await User.countDocuments();
    const totalRevenueData = await Order.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    const totalSalesData = await Order.aggregate([
      { $match: { status: 'paid' } },
      { $unwind: '$items' },
      { $group: { _id: null, total: { $sum: '$items.quantity' } } }
    ]);

    res.json({
      totalOrders,
      totalProducts,
      totalUsers,
      totalRevenue: totalRevenueData[0]?.total || 0,
      totalSales: totalSalesData[0]?.total || 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/orders', async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'name email')
      .populate('items.product', 'title')
      .sort({ createdAt: -1 })
      .limit(10);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;