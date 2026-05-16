const Player = require('../models/Player');
const {
  uploadImageFromUrl,
  deleteFromCloudinary,
} = require('../utils/uploadToCloudinary');


/* =========================
   HELPER
========================= */

async function resolveImage(imageUrl) {
  if (!imageUrl) return '';
  return await uploadImageFromUrl(imageUrl);
}


/* =========================
   GET ALL PLAYERS
========================= */

exports.getPlayers = async (req, res) => {

  try {

    const data = await Player.find()
      .sort({ createdAt: -1 });

    res.json(data);

  } catch (err) {

    res.status(500).json({ message: err.message });
  }
};


/* =========================
   CREATE PLAYER
========================= */

exports.createPlayer = async (req, res) => {

  try {

    const body = { ...req.body };

    if (body.image) {
      body.image = await resolveImage(body.image);
    }

    const newPlayer = new Player(body);

    await newPlayer.save();

    const io = req.app.get('io');

    io.emit('notification', {
      type:    'player',
      action:  'create',
      message: `🔥 New player joined: ${newPlayer.ign}`
    });

    res.status(201).json(newPlayer);

  } catch (err) {

    res.status(500).json({ message: err.message });
  }
};


/* =========================
   UPDATE PLAYER
   Deletes old Cloudinary image
   when image is replaced.
========================= */

exports.updatePlayer = async (req, res) => {

  try {

    const body = { ...req.body };

    if (body.image) {

      /* Fetch existing player to get old image URL */
      const existing = await Player.findById(req.params.id);

      const newImageUrl = await resolveImage(body.image);

      /* Delete old Cloudinary image if it's being replaced */
      if (existing?.image && existing.image !== newImageUrl) {
        await deleteFromCloudinary(existing.image);
      }

      body.image = newImageUrl;
    }

    const updated = await Player.findByIdAndUpdate(
      req.params.id,
      body,
      { returnDocument: 'after' }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Player not found' });
    }

    const io = req.app.get('io');

    io.emit('notification', {
      type:    'player',
      action:  'update',
      message: `✏️ Player updated: ${updated.ign}`
    });

    res.json(updated);

  } catch (err) {

    res.status(500).json({ message: err.message });
  }
};


/* =========================
   DELETE PLAYER
   Also removes image from
   Cloudinary.
========================= */

exports.deletePlayer = async (req, res) => {

  try {

    const deleted = await Player.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: 'Player not found' });
    }

    /* Delete image from Cloudinary */
    if (deleted.image) {
      await deleteFromCloudinary(deleted.image);
    }

    const io = req.app.get('io');

    io.emit('notification', {
      type:    'player',
      action:  'delete',
      message: `❌ Player removed: ${deleted.ign}`
    });

    res.json({ message: 'Player deleted' });

  } catch (err) {

    res.status(500).json({ message: err.message });
  }
};