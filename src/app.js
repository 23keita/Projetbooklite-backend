import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
// Import routes
import authRoutes from './routes/auth.routes.js'; // Handles login, register, profile updates
import productRoutes from './routes/products.js'; // Handles products
import orderRoutes from './routes/orders.js'; // Handles orders
import adminUserRoutes from './routes/user.routes.js'; // Handles user management by admins
import dashboardRoutes from './routes/dashboard.js'; // Handles dashboard stats
import driveDownloadRoutes from './routes/driveDownload.js'; // Handles secure file downloads
import filesRoutes from './routes/files.js'; // Handles local file uploads
import contactRoutes from './routes/contact.routes.js'; // Handles contact form
import clientUserRoutes from './routes/user.js'; // Handles user-specific actions like password change
import uploadRouter from "./routes/upload.js"; // <-- ton fichier de route

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
      imgSrc: ["'self'", "data:", "http://localhost:5173"],
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
app.use("/upload", uploadRouter);
// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Lightweight version endpoint for smooth client updates
const BOOT_TIME = new Date().toISOString();
app.get('/api/version', (req, res) => {
  res.json({
    success: true,
    version: process.env.APP_VERSION || 'dev',
    builtAt: process.env.BUILD_TIME || BOOT_TIME,
  });
});

export default app;