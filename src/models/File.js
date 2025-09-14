import mongoose from "mongoose";

const fileSchema = new mongoose.Schema({
    fileId: { type: String, required: true, unique: true },  // identifiant unique
    name: { type: String, required: true },                  // nom original (ex: banking-app-interface.zip)
    path: { type: String, required: true },                  // chemin sur le serveur
    mimetype: { type: String },                              // type MIME (ex: application/zip)
    size: { type: Number },                                  // taille en octets
    createdAt: { type: Date, default: Date.now },
});

export const FileModel = mongoose.model("File", fileSchema);
