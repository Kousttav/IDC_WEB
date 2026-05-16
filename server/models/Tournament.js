const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({

  name: String,

  game: String,

  status: String,

  date: String,

  prizePool: String,

  format: String,

  startDate: { type: Date, default: null },

  endDate: { type: Date, default: null }

}, {
  timestamps: true
});

module.exports = mongoose.model(
  'Tournament',
  tournamentSchema
);