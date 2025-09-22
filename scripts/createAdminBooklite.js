import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../src/models/User.js';
import dotenv from 'dotenv';

dotenv.config();

async function createAdminBooklite() {
  try {
    console.log('Tentative de connexion à MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Connecté à MongoDB');
    
    // Supprimer l'ancien admin s'il existe
    await User.deleteOne({ email: 'admin@booklite.com' });
    console.log('Ancien admin supprimé');
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
    const admin = new User({
      name: 'Admin Booklite',
      email: 'admin@booklite.com',
      password: hashedPassword,
      role: 'admin',
      isVerified: true
    });
    
    await admin.save();
    
    console.log('✅ Admin créé avec succès');
    console.log('Email: admin@booklite.com');
    console.log('Mot de passe: admin123');
    console.log('Rôle: admin');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Déconnecté de MongoDB');
  }
}

createAdminBooklite();