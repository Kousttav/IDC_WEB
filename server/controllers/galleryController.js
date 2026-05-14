const Gallery = require('../models/Gallery');

const BASE =
  process.env.BASE_URL ||
  'http://localhost:5000';


/* =========================
   GET ALL GALLERY
========================= */

exports.getGallery = async (req, res) => {

  try {

    const data = await Gallery.find()
      .sort({ createdAt: -1 });

    res.json(data);

  } catch (err) {

    res.status(500).json({
      message: err.message
    });
  }
};


/* =========================
   CREATE GALLERY ITEM
========================= */

exports.createGallery = async (req, res) => {

  try {

    const imagePath = req.file
      ? `${BASE}/uploads/${req.file.filename}`
      : req.body.src;

    const newData = new Gallery({

      src: imagePath,

      caption: req.body.caption || ''

    });

    await newData.save();

    res.status(201).json(newData);

  } catch (err) {

    res.status(500).json({
      message: err.message
    });
  }
};


/* =========================
   UPDATE GALLERY ITEM
========================= */

exports.updateGallery = async (req, res) => {

  try {

    const updatedData = {

      caption: req.body.caption

    };

    if (req.file) {

      updatedData.src =
        `${BASE}/uploads/${req.file.filename}`;
    }

    const updated =
      await Gallery.findByIdAndUpdate(

        req.params.id,

        updatedData,

        { returnDocument: 'after' }

      );

    if (!updated) {

      return res.status(404).json({
        message: 'Gallery item not found'
      });
    }

    res.json(updated);

  } catch (err) {

    res.status(500).json({
      message: err.message
    });
  }
};


/* =========================
   DELETE GALLERY ITEM
========================= */

exports.deleteGallery = async (req, res) => {

  try {

    const deleted =
      await Gallery.findByIdAndDelete(
        req.params.id
      );

    if (!deleted) {

      return res.status(404).json({
        message: 'Gallery item not found'
      });
    }

    res.json({
      message: 'Gallery item deleted'
    });

  } catch (err) {

    res.status(500).json({
      message: err.message
    });
  }
};