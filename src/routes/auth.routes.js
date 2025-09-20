import express from 'express';
import { login, register, refreshToken, logout, getMe, updateProfile, deleteAccount, forgotPassword, resetPassword, changePassword, googleAuth, googleCallback } from '../auth.controller.js';
import passport from '../config/passport.js';
import auth from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validation.js';
import { apiLimiter, createAccountLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/login', apiLimiter, validate(schemas.login), login);
router.post('/register', createAccountLimiter, validate(schemas.register), register);
router.post('/forgot-password', apiLimiter, forgotPassword);
router.post('/reset-password', apiLimiter, resetPassword);
router.post('/refresh-token', refreshToken);
router.post('/logout', auth, logout);
router.get('/me', auth, getMe);
router.put('/profile', auth, updateProfile);
router.put('/password', auth, changePassword); // Ajout de la route pour changer le mot de passe
router.delete('/account', auth, deleteAccount);

// Google OAuth routes (conditionnelles)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  router.get('/google', googleAuth);
  router.get('/google/callback', passport.authenticate('google'), googleCallback);
}

export default router;