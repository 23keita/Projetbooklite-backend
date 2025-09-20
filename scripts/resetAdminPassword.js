import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../src/models/User.js';
import dotenv from 'dotenv';

dotenv.config();

async function resetAdminPassword() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const newPassword = 'admin123';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    await User.findOneAndUpdate(
      { email: 'admin@booklite.com' },
      { password: hashedPassword }
    );
    
    console.log('✅ Mot de passe admin réinitialisé');
    console.log('Email: admin@booklite.com');
    console.log('Mot de passe: admin123');
    
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await mongoose.disconnect();
  }
}

resetAdminPassword();