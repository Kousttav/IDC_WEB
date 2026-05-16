const Gallery = require('../models/Gallery');
const {
  uploadMulterFileToCloudinary,
  uploadImageFromUrl,
  deleteFromCloudinary,
} = require('../utils/uploadToCloudinary');


/* =========================
   GET ALL GALLERY
========================= */

exports.getGallery = async (req, res) => {

  try {

    const data = await Gallery.find()
      .sort({ createdAt: -1 });

    res.json(data);

  } catch (err) {

    res.status(500).json({ message: err.message });
  }
};


/* =========================
   CREATE GALLERY ITEM
========================= */

exports.createGallery = async (req, res) => {

  try {

    const imagePath = req.file
      ? await uploadMulterFileToCloudinary(req.file)
      : await uploadImageFromUrl(req.body.src);

    const newData = new Gallery({
      src:     imagePath,
      caption: req.body.caption || ''
    });

    await newData.save();

    res.status(201).json(newData);

  } catch (err) {

    res.status(500).json({ message: err.message });
  }
};


/* =========================
   UPDATE GALLERY ITEM
   Deletes old Cloudinary image
   when a new one is supplied.
========================= */

exports.updateGallery = async (req, res) => {

  try {

    const updatedData = {
      caption: req.body.caption
    };

    /* Resolve new image if provided */
    if (req.file) {
      updatedData.src = await uploadMulterFileToCloudinary(req.file);
    } else if (req.body.src) {
      updatedData.src = await uploadImageFromUrl(req.body.src);
    }

    /* Fetch existing record before update */
    const existing = await Gallery.findById(req.params.id);

    if (!existing) {
      return res.status(404).json({ message: 'Gallery item not found' });
    }

    /* Delete old Cloudinary image if src is being replaced */
    if (updatedData.src && existing.src !== updatedData.src) {
      await deleteFromCloudinary(existing.src);
    }

    const updated = await Gallery.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { returnDocument: 'after' }
    );

    res.json(updated);

  } catch (err) {

    res.status(500).json({ message: err.message });
  }
};


/* =========================
   DELETE GALLERY ITEM
   Also removes image from
   Cloudinary.
========================= */

exports.deleteGallery = async (req, res) => {

  try {

    const deleted = await Gallery.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: 'Gallery item not found' });
    }

    /* Delete image from Cloudinary */
    await deleteFromCloudinary(deleted.src);

    res.json({ message: 'Gallery item deleted' });

  } catch (err) {

    res.status(500).json({ message: err.message });
  }
};