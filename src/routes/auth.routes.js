import express from 'express';
import { login, register, refreshToken, logout, getMe, updateProfile, deleteAccount, forgotPassword, resetPassword } from '../auth.controller.js';
import { auth } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validation.js';

const router = express.Router();

router.post('/login', validate(schemas.login), login);
router.post('/register', validate(schemas.register), register);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/refresh-token', refreshToken);
router.post('/logout', auth, logout);
router.get('/me', auth, getMe);
router.put('/profile', auth, updateProfile);
router.delete('/account', auth, deleteAccount);

export default router;