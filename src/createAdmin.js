// createAdmin.js
import mongoose from "mongoose";
import bcrypt from "bcrypt";

// 👉 Mets ton URI MongoDB Atlas ici
const MONGODB_URI='';

// Ton schema existant
const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        role: { type: String, enum: ["user", "admin"], default: "user" },
        isVerified: { type: Boolean, default: false },
        refreshToken: { type: String },
    },
    { timestamps: true }
);

const User = mongoose.model("User", userSchema);

async function createAdmin() {
    try {
        await mongoose.connect(MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        const email = "admin@booklite.org";
        const existingAdmin = await User.findOne({ email });

        if (existingAdmin) {
            console.log("⚠️ Un admin existe déjà :", existingAdmin.email);
        } else {
            // Hash du mot de passe
            const hashedPassword = await bcrypt.hash("ahdgdt68436gs", 12);

            const admin = new User({
                name: "Antoine Keita",
                email,
                password:"",
                role: "admin",
                isVerified: true,
            });

            await admin.save();
            console.log("✅ Admin créé avec succès !");
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error("❌ Erreur :", err);
    }
}

createAdmin();
