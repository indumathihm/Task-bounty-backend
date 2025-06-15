import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from './cloudinary.js'; 

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const isRaw =
      file.mimetype === 'application/pdf' ||
      file.mimetype === 'application/zip' ||
      file.mimetype === 'application/x-zip-compressed' ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    return {
      folder: 'uploads',
      resource_type: isRaw ? 'raw' : 'image',
      allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'docx', 'zip'],
    };
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/zip',
    'application/x-zip-compressed'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only images, PDFs, DOCX, and ZIP files are allowed!'), false);
  }
};

const uploads = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, 
});

export default uploads;
