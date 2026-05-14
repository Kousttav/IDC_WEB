const router = require('express').Router();

const upload   = require('../middleware/upload');
const { downloadImageFromUrl } = require('../utils/downloadImage');

const {
  getGallery,
  createGallery,
  updateGallery,
  deleteGallery
} = require('../controllers/galleryController');


/* =========================
   GET ALL
========================= */

router.get('/', getGallery);


/* =========================
   CREATE (file upload)
========================= */

router.post(
  '/',
  upload.single('image'),
  createGallery
);


/* =========================
   UPLOAD — local file
   Used by player form image
   picker (direct file upload)
========================= */

router.post(
  '/upload',
  upload.single('image'),
  (req, res) => {

    if (!req.file) {
      return res.status(400).json({
        error: 'No file received'
      });
    }

    res.json({
      imageUrl:
        `${process.env.BASE_URL || 'http://localhost:5000'}/uploads/${req.file.filename}`
    });
  }
);


/* =========================
   UPLOAD FROM URL
   Used by Excel import to pull
   Google Drive images onto the
   server and store them locally.

   Body: { imageUrl: "https://drive.google.com/..." }
   Returns: { imageUrl: "http://localhost:5000/uploads/..." }
========================= */

router.post('/upload-from-url', async (req, res) => {

  const { imageUrl } = req.body;

  if (!imageUrl || imageUrl.trim() === '') {
    return res.status(400).json({
      error: 'imageUrl is required in request body'
    });
  }

  try {

    const localPath = await downloadImageFromUrl(imageUrl);

    if (!localPath) {
      return res.status(422).json({
        error:
          'Could not download image. ' +
          'Make sure the Drive file is shared as "Anyone with the link can view".'
      });
    }

    const BASE = process.env.BASE_URL || 'http://localhost:5000';

    res.json({ imageUrl: `${BASE}${localPath}` });

  } catch (err) {

    console.error('upload-from-url error:', err.message);

    res.status(500).json({
      error: 'Server error while downloading image',
      detail: err.message
    });
  }
});


/* =========================
   UPDATE / DELETE
========================= */

router.put('/:id', updateGallery);

router.delete('/:id', deleteGallery);


module.exports = router;