import express from "express";
import multer from "multer";
import cloudinary from "./cloudinary.js"; // Importer la configuration centralisée
import { CloudinaryStorage } from 'multer-storage-cloudinary';

const router = express.Router();

// Multer + Cloudinary storage
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "products", // dossier pour les produits
        allowed_formats: ["jpg", "png", "jpeg", "gif"],
    },
});

const parser = multer({ storage });

// POST /upload pour recevoir l'image du frontend
router.post("/", parser.single("image"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "Aucun fichier reçu. L'upload a échoué." });
        }
        // req.file.path contient l'URL Cloudinary
        res.json({ url: req.file.path });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "L'upload a échoué" });
    }
});

export default router;
