import express from 'express';
import auth, { admin } from '../middleware/auth.js';

const router = express.Router();

// Route de test pour vérifier l'authentification
router.get('/auth', auth, (req, res) => {
  res.json({
    message: 'Authentification réussie',
    user: req.user
  });
});

// Route de test pour vérifier les droits admin
router.get('/admin', auth, admin, (req, res) => {
  res.json({
    message: 'Accès admin réussi',
    user: req.user
  });
});

export default router;