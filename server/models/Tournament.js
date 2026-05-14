const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({

  name: String,

  game: String,

  status: String,

  date: String,

  prizePool: String,

  format: String

}, {
  timestamps: true
});

module.exports = mongoose.model(
  'Tournament',
  tournamentSchema
);