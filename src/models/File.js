import mongoose from "mongoose";

const fileSchema = new mongoose.Schema({
    fileId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    path: { type: String, required: true }
});

export default mongoose.model("File", fileSchema);
