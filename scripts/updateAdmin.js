import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../src/models/User.js';
import dotenv from 'dotenv';

dotenv.config();

async function updateAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connecté à MongoDB');
    
    // Supprimer l'ancien admin s'il existe
    await User.deleteOne({ email: 'admin@booklite.com' });
    
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
    
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await mongoose.disconnect();
  }
}

updateAdmin();