import mongoose from 'mongoose';

const PasswordResetTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  token: {
    type: String,
    required: true,
    unique: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    // Le document sera automatiquement supprimé 1 heure après sa création
    index: { expires: '1h' },
  },
});

export default mongoose.model('PasswordResetToken', PasswordResetTokenSchema);