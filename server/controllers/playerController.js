const Player = require('../models/Player');
const { downloadImageFromUrl } = require('../utils/downloadImage');

const BASE = process.env.BASE_URL || 'http://localhost:5000';


/* =========================
   HELPER
   If the image field looks like
   a Drive URL, download it to
   /uploads and return local URL.
   Otherwise return as-is.
========================= */

async function resolveImage(imageUrl) {
  if (!imageUrl) return '';

  const isDriveLink =
    imageUrl.includes('drive.google.com') ||
    imageUrl.includes('docs.google.com');

  if (isDriveLink) {
    const localPath = await downloadImageFromUrl(imageUrl);
    return localPath ? `${BASE}${localPath}` : '';
  }

  // Already a direct URL or local path — keep it
  return imageUrl;
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

    res.status(500).json({
      message: err.message
    });
  }
};


/* =========================
   CREATE PLAYER
   Auto-downloads Drive image
   before saving to DB.
========================= */

exports.createPlayer = async (req, res) => {

  try {

    const body = { ...req.body };

    /* Resolve Drive image → local URL */
    if (body.image) {
      body.image = await resolveImage(body.image);
    }

    const newPlayer = new Player(body);

    await newPlayer.save();


    /* SOCKET NOTIFICATION */

    const io = req.app.get('io');

    io.emit('notification', {

      type: 'player',

      action: 'create',

      message:
        `🔥 New player joined: ${newPlayer.ign}`

    });


    res.status(201).json(newPlayer);

  } catch (err) {

    res.status(500).json({
      message: err.message
    });
  }
};


/* =========================
   UPDATE PLAYER
   Also resolves Drive image
   if image field was changed.
========================= */

exports.updatePlayer = async (req, res) => {

  try {

    const body = { ...req.body };

    /* Resolve Drive image → local URL */
    if (body.image) {
      body.image = await resolveImage(body.image);
    }

    const updated =
      await Player.findByIdAndUpdate(
        req.params.id,
        body,
        { returnDocument: 'after' }
      );

    if (!updated) {

      return res.status(404).json({
        message: 'Player not found'
      });
    }


    /* SOCKET NOTIFICATION */

    const io = req.app.get('io');

    io.emit('notification', {

      type: 'player',

      action: 'update',

      message:
        `✏️ Player updated: ${updated.ign}`

    });


    res.json(updated);

  } catch (err) {

    res.status(500).json({
      message: err.message
    });
  }
};


/* =========================
   DELETE PLAYER
========================= */

exports.deletePlayer = async (req, res) => {

  try {

    const deleted =
      await Player.findByIdAndDelete(
        req.params.id
      );

    if (!deleted) {

      return res.status(404).json({
        message: 'Player not found'
      });
    }


    /* SOCKET NOTIFICATION */

    const io = req.app.get('io');

    io.emit('notification', {

      type: 'player',

      action: 'delete',

      message:
        `❌ Player removed: ${deleted.ign}`

    });


    res.json({
      message: 'Player deleted'
    });

  } catch (err) {

    res.status(500).json({
      message: err.message
    });
  }
};