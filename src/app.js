import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import compression from 'compression';
import session from 'express-session';
import passport from './config/passport.js';
import path from 'path';
import { fileURLToPath } from 'url';
// Import routes
import authRoutes from './routes/auth.routes.js'; // Handles login, register, profile updates
import productRoutes from './routes/products.js'; // Handles products
import orderRoutes from './routes/orders.js'; // Handles orders
import adminUserRoutes from './routes/user.routes.js'; // Handles user management by admins
import dashboardRoutes from './routes/dashboard.js'; // Handles dashboard stats
import driveDownloadRoutes from './routes/driveDownload.js'; // Handles secure file downloads
import filesRoutes from './routes/files.js'; // Handles local file uploads
import contactRoutes from './routes/contact.routes.js';
import clientUserRoutes from './routes/user.js'; // Handles user-specific actions like password change
import uploadRouter from "./routes/upload.js";
import webhookRoutes from './routes/webhooks.js';
import downloadRoutes from './routes/download.js';
import testAuthRoutes from './routes/test-auth.js';
dotenv.config();

// Check for JWT secrets
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET and JWT_REFRESH_SECRET must be defined in your .env file.");
  process.exit(1);
}

// Optional: warn if DOWNLOAD_SECRET is missing (non-fatal for current features)
if (!process.env.DOWNLOAD_SECRET) {
  console.warn("WARNING: DOWNLOAD_SECRET is not set. Generate one with 'node scripts/generate-secret.js' and add it to your .env under 'DOWNLOAD_SECRET='.");
}

const app = express();

// --- Security Middlewares ---

const isProduction = process.env.NODE_ENV === 'production';

// --- Performance Middleware ---
app.use(compression()); // Activer la compression Gzip pour toutes les réponses

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"], // Empêche l'exécution de scripts non approuvés si une réponse API est interprétée comme HTML.
      styleSrc: ["'self'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      // Autorise les images depuis les domaines que vous utilisez réellement.
      imgSrc: [
        "'self'",
        "data:",
        "https://res.cloudinary.com", // Pour Cloudinary
        "https://drive.google.com",   // Pour les aperçus Google Drive
        "https://via.placeholder.com" // Pour les images de remplacement
      ],
      // Autorise les connexions (API calls, WebSockets) vers la même origine.
      // C'est une bonne pratique pour les API.
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      // Met à niveau toutes les requêtes HTTP vers HTTPS (uniquement en production)
      upgradeInsecureRequests: isProduction ? [] : null,
    },
  },
  // Pour éviter des problèmes de chargement de ressources cross-origin, il est souvent plus sûr de ne pas utiliser la politique COEP la plus stricte par défaut.
  crossOriginEmbedderPolicy: false,
}));

const allowedOrigins = [
    "http://localhost:5173",   // pour dev
    "https://booklite.org",    // ton frontend en prod
];
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
}));

app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));
app.use(passport.initialize());
app.use(passport.session());
app.use('/uploads', express.static('uploads'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', adminUserRoutes); // Routes for admins to manage users
app.use('/api/users', clientUserRoutes); // Routes for users to manage their own account (e.g., change password)
app.use('/api/dashboard', dashboardRoutes);
app.use('/api', driveDownloadRoutes);
app.use('/api/local-files', filesRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/upload', uploadRouter);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/orders', downloadRoutes);
app.use('/api/test', testAuthRoutes);

// Lightweight version endpoint for smooth client updates
const BOOT_TIME = new Date().toISOString();
app.get('/api/version', (req, res) => {
  res.json({
    success: true,
    version: process.env.APP_VERSION || 'dev',
    builtAt: process.env.BUILD_TIME || BOOT_TIME,
  });
});

// --- Production Frontend Serving ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.NODE_ENV === 'production') {
  // Définir le chemin vers le build de l'application React
  const buildPath = path.resolve(__dirname, '../../Projetbooklite/dist');

  // Servir les fichiers statiques (JS, CSS, images...) de l'application React
  app.use(express.static(buildPath));

  // Le "catchall" : pour toute requête GET qui ne correspond pas à une route API
  // ou à un fichier statique, renvoyer le fichier index.html de React.
  // C'est ce qui permet au routing côté client (React Router) de fonctionner.
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(buildPath, 'index.html'));
  });
}

// Error handling (doit être le dernier middleware pour bien fonctionner)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

export default app;