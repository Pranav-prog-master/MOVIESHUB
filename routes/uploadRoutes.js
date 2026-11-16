const express = require('express');
const router = express.Router();
const c = require('../controllers/uploadController');
const ensureAdmin = require('../middleware/admin');
const { uploadPoster, uploadBackdrop, handleUploadError } = require('../middleware/upload');

router.use(ensureAdmin);

router.post('/poster', uploadPoster, handleUploadError, c.uploadPoster);
router.post('/backdrop', uploadBackdrop, handleUploadError, c.uploadBackdrop);

module.exports = router;
