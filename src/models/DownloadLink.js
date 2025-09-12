import mongoose from 'mongoose';

const downloadLinkSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  fileId: { type: String, required: true },
  fileName: { type: String },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  maxDownloads: { type: Number, default: 3 },
  downloadCount: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true, index: true },
  revoked: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: false });

// TTL index to auto-remove expired links (MongoDB will delete docs after expiresAt)
downloadLinkSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('DownloadLink', downloadLinkSchema);
