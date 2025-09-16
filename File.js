import mongoose from "mongoose";

const fileSchema = new mongoose.Schema({
    fileId: { type: String, required: true, unique: true },
    fileName: { type: String, required: true },
    cloudinaryUrl: { type: String, required: true }, // URL directe Cloudinary
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("File", fileSchema);
