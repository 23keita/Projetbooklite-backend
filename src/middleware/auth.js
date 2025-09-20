import 'dotenv/config';
import jwt from 'jsonwebtoken';
import TokenBlocklist from '../models/TokenBlocklist.js';

const JWT_SECRET = process.env.JWT_SECRET;

const auth = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'Accès non autorisé, token manquant' });
  }

  try {
    // 1. Vérifier la signature et l'expiration du jeton
    const decoded = jwt.verify(token, JWT_SECRET);

    // 2. Vérifier si le jeton a été révoqué (est dans la blocklist)
    if (decoded.jti) {
      const isBlocklisted = await TokenBlocklist.findOne({ jti: decoded.jti });
      if (isBlocklisted) {
        return res.status(401).json({ message: 'Token révoqué. Veuillez vous reconnecter.' });
      }
    }

    // 3. Si le jeton est valide et non révoqué, attacher les infos utilisateur à la requête
    req.user = decoded; // Ajoute { id, role, jti, exp, iat } à la requête
    next();
  } catch (e) {
    if (e && e.name === 'TokenExpiredError') {
      console.warn('Token verification failed: jwt expired');
      return res.status(401).json({ code: 'token_expired', message: 'Jeton expiré' });
    }
    console.error('Token verification failed:', e.message);
    res.status(401).json({ message: 'Token invalide ou expiré' });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  res.status(403).json({ message: 'Accès refusé, rôle administrateur requis' });
};

export default auth;
export { admin };