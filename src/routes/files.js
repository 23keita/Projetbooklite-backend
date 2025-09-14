import express from "express";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { FileModel } from "../models/File.js";

const router = express.Router();

// config stockage local
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/"),
    filename: (req, file, cb) => {
        const uniqueName = `file-${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    },
});

const upload = multer({ storage });

// 📥 Upload fichier
router.post("/upload", upload.single("file"), async (req, res) => {
    try {
        const fileId = uuidv4(); // identifiant unique
        const newFile = new FileModel({
            fileId,
            name: req.file.originalname,
            path: req.file.path,
            mimetype: req.file.mimetype,
            size: req.file.size,
        });

        await newFile.save();

        res.json({
            success: true,
            fileId,
            name: req.file.originalname,
            path: req.file.path,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Erreur lors de l’upload" });
    }
});

export default router;
