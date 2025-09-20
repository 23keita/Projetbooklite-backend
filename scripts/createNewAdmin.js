import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../src/models/User.js';
import dotenv from 'dotenv';

dotenv.config();

async function createNewAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Supprimer l'ancien admin s'il existe
    await User.deleteOne({ email: 'admin@test.com' });
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('123456', salt);
    
    const admin = new User({
      name: 'Admin',
      email: 'admin@test.com',
      password: hashedPassword,
      role: 'admin',
      isVerified: true
    });
    
    await admin.save();
    
    console.log('✅ Nouvel admin créé');
    console.log('Email: admin@test.com');
    console.log('Mot de passe: 123456');
    
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await mongoose.disconnect();
  }
}

createNewAdmin();