import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

// Remplacez par votre token actuel
const token = process.argv[2];

if (!token) {
  console.log('Usage: node scripts/verifyToken.js <your-jwt-token>');
  console.log('Exemple: node scripts/verifyToken.js eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
  process.exit(1);
}

try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  console.log('Token décodé avec succès:');
  console.log(JSON.stringify(decoded, null, 2));
} catch (error) {
  console.error('Erreur de vérification du token:', error.message);
}