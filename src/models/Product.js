import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true },
    image: { type: String, required: true },
  // Compatibilité: ancien champ single-file
  fileId: { type: String }, // ID du fichier Google Drive (legacy)
  fileName: { type: String }, // Nom du fichier original (legacy)
  // Nouveau: support des packs (plusieurs fichiers)
  files: [
    {
      fileId: { type: String, required: true },
      fileName: { type: String },
      mimeType: { type: String },
      size: { type: String },
      addedAt: { type: Date, default: Date.now },
    }
  ],
  stock: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('Product', productSchema);