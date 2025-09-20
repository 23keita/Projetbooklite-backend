import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

// Configuration Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'booklite_uploads',
        allowed_formats: ['jpg', 'png', 'jpeg', 'gif', 'zip', 'mp4', 'mov', 'pdf', 'avi'],
        resource_type: 'auto',
    },
});

export const upload = multer({ 
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
});

export { cloudinary };

