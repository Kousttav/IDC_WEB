const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({

  icon: String,

  date: String,

  title: String,

  desc: String,

  badge: String

}, {
  timestamps: true
});

module.exports = mongoose.model(
  'Achievement',
  achievementSchema
);