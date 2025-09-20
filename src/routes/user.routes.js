import express from 'express';
import auth, { admin } from '../middleware/auth.js';
import { getAllUsers, updateUserRole, deleteUser } from './user.controller.js';

const router = express.Router();

// Toutes les routes de gestion des utilisateurs sont réservées aux administrateurs
router.use(auth, admin);

router.get('/', getAllUsers);
router.put('/:id/role', updateUserRole);
router.delete('/:id', deleteUser);

export default router;