import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

// Import routes
import authRoutes from './routes/auth.routes.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import userRoutes from './routes/user.routes.js';
import dashboardRoutes from './routes/dashboard.js';

dotenv.config();

// Check for JWT secrets
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET and JWT_REFRESH_SECRET must be defined in your .env file.");
  process.exit(1);
}

const app = express();

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      // Par défaut, n'autorise que les ressources de la même origine.
      defaultSrc: ["'self'"],
      // N'autorise les scripts que depuis l'origine propre.
      scriptSrc: ["'self'"],
      // Autorise les styles depuis l'origine propre ET Google Fonts.
      styleSrc: ["'self'", 'https://fonts.googleapis.com'],
      // Autorise les polices depuis l'origine propre ET Google Fonts.
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      // Autorise les images depuis l'origine propre et les data URIs (pour les images encodées en base64).
      imgSrc: ["'self'", "data:"],
      // N'autorise aucune ressource à être chargée via des plugins (ex: <object>, <embed>).
      objectSrc: ["'none'"],
      // Empêche le site d'être intégré dans un <iframe> (protection contre le clickjacking).
      frameAncestors: ["'none'"],
      // Met à niveau toutes les requêtes HTTP vers HTTPS en production.
      upgradeInsecureRequests: [],
    },
  },
  // Pour éviter des problèmes de chargement de ressources cross-origin, il est souvent plus sûr de ne pas utiliser la politique COEP la plus stricte par défaut.
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(cookieParser());
app.use('/uploads', express.static('uploads'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

export default app;