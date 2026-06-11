const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

function createStorage(destination) {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const fullPath = path.join(__dirname, '../../', destination);
      fs.mkdirSync(fullPath, { recursive: true });
      cb(null, fullPath);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, uuidv4() + ext);
    },
  });
}

const imageFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes (jpg, jpeg, png, webp, gif)'), false);
  }
};

const uploadImages = multer({
  storage: createStorage(process.env.UPLOAD_PATH || 'public/uploads/images'),
  fileFilter: imageFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 },
});

const uploadAvatar = multer({
  storage: createStorage(process.env.AVATAR_PATH || 'public/uploads/avatars'),
  fileFilter: imageFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
});

module.exports = { uploadImages, uploadAvatar };
