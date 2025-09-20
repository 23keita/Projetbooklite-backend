import mongoose from 'mongoose';
import User from '../src/models/User.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkAndSetAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connecté à MongoDB');

    // Lister tous les utilisateurs
    const users = await User.find({}).select('name email role');
    console.log('\nUtilisateurs existants:');
    users.forEach(user => {
      console.log(`- ${user.name} (${user.email}) - Rôle: ${user.role}`);
    });

    // Demander quel utilisateur promouvoir admin
    if (users.length === 0) {
      console.log('Aucun utilisateur trouvé');
      return;
    }

    // Prendre le premier utilisateur et le promouvoir admin
    const firstUser = users[0];
    console.log(`\nPromotion de ${firstUser.name} en administrateur...`);
    
    await User.findByIdAndUpdate(firstUser._id, { role: 'admin' });
    console.log('✅ Utilisateur promu administrateur avec succès');

    // Vérifier
    const updatedUser = await User.findById(firstUser._id);
    console.log(`Rôle mis à jour: ${updatedUser.role}`);

  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkAndSetAdmin();