import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

const router = express.Router();

// Config Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Config Multer pour Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "products", // dossier Cloudinary
        allowed_formats: ["jpg", "png", "jpeg", "gif"],
    },
});

const parser = multer({ storage });

// Route POST /upload
router.post("/", parser.single("image"), async (req, res) => {
    try {
        // req.file.path contient l'URL Cloudinary
        res.json({ url: req.file.path });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Upload failed" });
    }
});

export default router;
