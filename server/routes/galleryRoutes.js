const router = require('express').Router();

const upload = require('../middleware/upload');
const {
  uploadMulterFileToCloudinary,
  uploadImageFromUrl,
} = require('../utils/uploadToCloudinary');

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
  async (req, res) => {

    if (!req.file) {
      return res.status(400).json({
        error: 'No file received'
      });
    }

    try {

      const imageUrl =
        await uploadMulterFileToCloudinary(req.file);  // → Cloudinary

      if (!imageUrl) {
        return res.status(422).json({
          error: 'Failed to upload image to Cloudinary'
        });
      }

      res.json({ imageUrl });

    } catch (err) {

      console.error('/upload error:', err.message);
      res.status(500).json({ error: err.message });

    }
  }
);


/* =========================
   UPLOAD FROM URL
   Used by Excel import to pull
   Google Drive images through
   Cloudinary.

   Body: { imageUrl: "https://drive.google.com/..." }
   Returns: { imageUrl: "https://res.cloudinary.com/..." }
========================= */

router.post('/upload-from-url', async (req, res) => {

  const { imageUrl } = req.body;

  if (!imageUrl || imageUrl.trim() === '') {
    return res.status(400).json({
      error: 'imageUrl is required in request body'
    });
  }

  try {

    const cloudinaryUrl = await uploadImageFromUrl(imageUrl);  // → Cloudinary

    if (!cloudinaryUrl) {
      return res.status(422).json({
        error:
          'Could not upload image to Cloudinary. ' +
          'Make sure the Drive file is shared as "Anyone with the link can view".'
      });
    }

    res.json({ imageUrl: cloudinaryUrl });

  } catch (err) {

    console.error('upload-from-url error:', err.message);

    res.status(500).json({
      error: 'Server error while uploading image',
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