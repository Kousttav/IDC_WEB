const multer = require('multer');

/* =========================
   MULTER — memory storage
   Keeps file as req.file.buffer
   so it can be piped directly
   to Cloudinary (no disk write).
========================= */

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 50 * 1024 * 1024 },
});

module.exports = upload;