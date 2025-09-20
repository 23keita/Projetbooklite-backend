
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

export const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'booklite_uploads', // Dossier sur Cloudinary
        allowed_formats: ['jpg', 'png', 'jpeg', 'gif', 'zip', 'mp4', 'mov'],
    },
});

export const upload = multer({ storage });

