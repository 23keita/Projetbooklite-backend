import express from 'express';
import { login, register, refreshToken, logout, getMe, updateProfile, deleteAccount, forgotPassword, resetPassword } from '../auth.controller.js';
import { auth } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validation.js';
import { authLimiter, createAccountLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/login', authLimiter, validate(schemas.login), login);
router.post('/register', createAccountLimiter, validate(schemas.register), register);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);
router.post('/refresh-token', refreshToken);
router.post('/logout', auth, logout);
router.get('/me', auth, getMe);
router.put('/profile', auth, updateProfile);
router.delete('/account', auth, deleteAccount);

export default router;