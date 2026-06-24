const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  type:    { type: String, required: true }, // 'tournament_created', 'player_added', etc.
  title:   { type: String, required: true },
  message: { type: String, required: true },
  read:    { type: Boolean, default: false },
  meta:    { type: mongoose.Schema.Types.Mixed, default: {} }, // any extra data
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);