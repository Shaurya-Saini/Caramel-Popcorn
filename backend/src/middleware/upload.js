import multer from 'multer';

// Hard cap on the *incoming* file (before compression) to reject absurd uploads
// outright. Anything under this gets compressed to a small WebP on the server.
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter(req, file, cb) {
    if (file.mimetype.startsWith('image/')) return cb(null, true);
    const err = new Error('Only image files are allowed');
    err.status = 400;
    cb(err);
  },
});

/** Accept a single optional `photo` field, surfacing multer errors as 400s. */
export function singlePhoto(req, res, next) {
  upload.single('photo')(req, res, (err) => {
    if (err) {
      const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : err.status || 400;
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'Image too large (max 15 MB). Please pick a smaller photo.'
          : err.message;
      return res.status(status).json({ error: 'Upload failed', message });
    }
    next();
  });
}
