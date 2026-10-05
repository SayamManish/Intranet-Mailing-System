const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const uploadDir = path.resolve(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage configuration with sanitized filenames and randomized UUID
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Extract extension securely - allow only alphanumeric characters
    const rawExt = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9]/g, '');
    const safeExt = rawExt ? `.${rawExt}` : '';
    // UUID ensures collision resistance and prevents path traversal
    const safeName = `${Date.now()}-${uuidv4()}${safeExt}`;
    cb(null, safeName);
  }
});

// Allowed extensions for general attachments
const allowedExtensions = /^(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|png|jpg|jpeg|gif|webp|zip|csv|json)$/;

// Allowed MIME types
const allowedMimeTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/json',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/zip',
  'application/x-zip-compressed'
];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  const isValidExt = allowedExtensions.test(ext);
  const isValidMime = allowedMimeTypes.includes(file.mimetype) || file.mimetype.startsWith('image/');

  if (isValidExt && isValidMime) {
    cb(null, true);
  } else {
    cb(new Error(`File type not permitted. Allowed formats: PDF, DOCX, XLSX, PPTX, TXT, CSV, Images, ZIP`), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024 // 10 MB
  },
  fileFilter: fileFilter
});

// Dedicated image-only filter for avatar profile updates
const avatarFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  const isImageExt = /^(png|jpg|jpeg|gif|webp)$/.test(ext);
  const isImageMime = file.mimetype.startsWith('image/');

  if (isImageExt && isImageMime) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (PNG, JPG, JPEG, GIF, WEBP) are allowed for profile avatars.'), false);
  }
};

const uploadAvatar = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2 MB limit for avatars
  },
  fileFilter: avatarFilter
});

module.exports = {
  upload,
  uploadAvatar
};
