import express from "express";
import multer from "multer";
import cloudinary from "../config/cloudinary.js";
import File from "../models/File.js";
import Product from "../models/Product.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() }); // stocke temporairement en mémoire

router.post("/upload/:productId", upload.single("file"), async (req, res) => {
    try {
        const { productId } = req.params;
        const fileBuffer = req.file.buffer;
        const fileName = req.file.originalname;

        // Upload sur Cloudinary
        const result = await cloudinary.uploader.upload_stream(
            { resource_type: "raw", public_id: fileName },
            async (error, result) => {
                if (error) {
                    console.error(error);
                    return res.status(500).json({ success: false, message: "Upload failed" });
                }

                // Créer un document File
                const file = new File({
                    fileId: result.public_id,
                    fileName,
                    cloudinaryUrl: result.secure_url,
                });
                await file.save();

                // Associer au produit
                const product = await Product.findById(productId);
                if (!product) return res.status(404).json({ success: false, message: "Product not found" });

                product.fileId = file.fileId;
                await product.save();

                res.json({ success: true, file });
            }
        );

        // Écrire le buffer dans le stream
        result.end(fileBuffer);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

export default router;
