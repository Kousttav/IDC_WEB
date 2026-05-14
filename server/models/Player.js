const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  ign:     String,
  name:    String,
  email:   String,
  contact: String,
  address: String,
  image:   String,
  bio:     String,
  social: {
    instagram: String,
    discord:   String
  },
  active: {
    type:    Boolean,
    default: true
  },
  role: {
    type:    String,
    enum:    ['player', 'admin'],
    default: 'player'
  }
}, { timestamps: true });

module.exports = mongoose.model('Player', playerSchema);