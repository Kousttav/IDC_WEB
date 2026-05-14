const router = require('express').Router();

const {
  getTournaments,
  createTournament,
  updateTournament,
  deleteTournament
} = require('../controllers/tournamentController');

router.get('/', getTournaments);

router.post('/', createTournament);

router.put('/:id', updateTournament);

router.delete('/:id', deleteTournament);

module.exports = router;