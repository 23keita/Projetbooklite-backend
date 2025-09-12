import 'dotenv/config';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import User from './models/User.js';
import TokenBlocklist from './models/TokenBlocklist.js';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

// Helper function to generate tokens
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user._id, role: user.role },
    JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE || '15m',
      jwtid: uuidv4() // Add unique identifier (jti)
    }
  );
  const refreshToken = jwt.sign({ id: user._id, role: user.role }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Utilisateur non trouvé' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Mot de passe incorrect' });
    }

    const { accessToken, refreshToken } = generateTokens(user);
    
    user.refreshToken = refreshToken;
    await user.save();

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({ accessToken, user: { ...user.toObject(), password: undefined, refreshToken: undefined } });
  } catch (error) {
    console.error('Erreur login:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const register = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(409).json({ message: 'Un utilisateur avec cet email existe déjà.' });
    }

    user = new User({
      name,
      email,
      password,
      isVerified: true, // Auto-vérification pour la simulation
    });

    const { accessToken, refreshToken } = generateTokens(user);
    user.refreshToken = refreshToken;

    await user.save();

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.refreshToken;

    res.status(201).json({ accessToken, user: userResponse });
  } catch (error) {
    console.error('Erreur register:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const refreshToken = async (req, res) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token manquant' });
  }

  try {
    // 1. Vérifier le refresh token entrant
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    
    const user = await User.findById(decoded.id);

    // 2. Vérifier si l'utilisateur existe et si le token correspond à celui enregistré
    if (!user || user.refreshToken !== refreshToken) {
      // SECURITY ALERT: Refresh token reuse detected.
      // This might indicate token theft. For maximum security,
      // we invalidate all sessions for this user.
      if (user) {
        console.warn(`SECURITY ALERT: Refresh token reuse detected for user ${user._id}. Invalidating all sessions.`);
        user.refreshToken = undefined;
        await user.save();
      }
      res.clearCookie('refreshToken');
      return res.status(403).json({ message: 'Refresh token invalide ou réutilisé.' });
    }

    // 3. The token is valid, generate a NEW pair of tokens (rotation)
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = generateTokens(user);

    // 4. Save the new refresh token for the user
    user.refreshToken = newRefreshToken;
    await user.save();

    // 5. Send the new tokens to the client
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({ accessToken: newAccessToken });
  } catch (error) {
    // This block will catch malformed or expired tokens
    console.error('Erreur refresh token:', error);
    res.clearCookie('refreshToken');
    res.status(403).json({ message: 'Refresh token invalide ou expiré' });
  }
};

export const logout = async (req, res) => {
  try {
    const { jti, exp } = req.user; // jti and exp come from the decoded accessToken payload

    // 1. Add the accessToken's JTI to the blocklist to invalidate it immediately.
    // The TTL index on the collection will automatically remove it after its expiration.
    if (jti && exp) {
      const expiresAt = new Date(exp * 1000);
      await TokenBlocklist.create({ jti, expiresAt });
    }

    // 2. Invalidate the refresh token by removing it from the database.
    const user = await User.findById(req.user.id);
    if (user) {
      user.refreshToken = undefined;
      await user.save();
    }
    
    // 3. Clear the client's cookie.
    res.clearCookie('refreshToken');
    res.json({ message: 'Déconnexion réussie et sécurisée.' });
  } catch (error) {
    if (error.code === 11000) { // Duplicate key error (token already in blocklist)
      res.clearCookie('refreshToken');
      return res.json({ message: 'Déconnexion réussie, jeton déjà invalidé.' });
    }
    console.error('Erreur logout:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -refreshToken');

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }
    res.json(user);
  } catch (error) {
    console.error('Erreur /api/auth/me:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, email },
      { new: true, runValidators: true }
    ).select('-password -refreshToken');
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }
    res.json(user);
  } catch (error) {
    console.error('Erreur mise à jour profil:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const deleteAccount = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user.id);
    res.clearCookie('refreshToken');
    res.json({ message: 'Compte supprimé' });
  } catch (error) {
    console.error('Erreur suppression compte:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};