const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const UPLOAD_ROOT = path.join(__dirname, '..', 'public', 'uploads');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const folder = file.fieldname === 'backdrop' ? 'backdrops' : (file.fieldname === 'screenshots' ? 'screenshots' : 'posters');
    const dir = path.join(UPLOAD_ROOT, folder);
    ensureDir(dir);
    cb(null, dir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const safe = crypto.randomBytes(16).toString('hex') + ext;
    cb(null, safe);
  }
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXT.includes(ext)) {
    return cb(new Error('Invalid file type. Only JPG, JPEG, PNG and WEBP are allowed.'));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE }
});

// Middleware variants used across the app.
const uploadPoster = upload.single('poster');
const uploadBackdrop = upload.single('backdrop');
const uploadMovie = upload.fields([
  { name: 'poster', maxCount: 1 },
  { name: 'backdrop', maxCount: 1 },
  { name: 'screenshots', maxCount: 4 }
]);

// Friendly Multer error -> next(err) with a readable message.
function handleUploadError(err, req, res, next) {
  if (err) {
    err.status = 400;
    err.message = err.message || 'File upload failed.';
  }
  next(err);
}

module.exports = { uploadPoster, uploadBackdrop, uploadMovie, handleUploadError, UPLOAD_ROOT };
