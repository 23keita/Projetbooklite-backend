import mongoose from 'mongoose';
import Order from '../src/models/Order.js';
import Product from '../src/models/Product.js';
import User from '../src/models/User.js';
import dotenv from 'dotenv';

dotenv.config();

async function createTestOrder() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Trouver l'utilisateur admin
    const user = await User.findOne({ email: 'admin@test.com' });
    if (!user) {
      console.log('Utilisateur admin@test.com non trouvé');
      return;
    }
    
    // Créer un produit de test s'il n'existe pas
    let product = await Product.findOne({ title: 'Produit Test' });
    if (!product) {
      product = new Product({
        title: 'Produit Test',
        description: 'Description du produit test',
        author: 'Test Author',
        price: 29.99,
        category: 'test',
        image: 'https://via.placeholder.com/300x200',
        isActive: true,
        stock: 10
      });
      await product.save();
      console.log('Produit test créé');
    }
    
    // Créer une commande de test
    const order = new Order({
      user: user._id,
      items: [{
        product: product._id,
        quantity: 1,
        price: product.price
      }],
      totalAmount: product.price,
      status: 'pending'
    });
    
    await order.save();
    console.log('✅ Commande test créée:', order._id);
    
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await mongoose.disconnect();
  }
}

createTestOrder();