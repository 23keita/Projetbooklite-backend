import mongoose from 'mongoose';

const tokenBlocklistSchema = new mongoose.Schema({
  jti: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
});

// Crée un index TTL qui supprime automatiquement les documents après leur date d'expiration.
tokenBlocklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('TokenBlocklist', tokenBlocklistSchema);