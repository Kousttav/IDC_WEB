const router = require('express').Router();

const {
  getAchievements,
  createAchievement,
  updateAchievement,
  deleteAchievement
} = require('../controllers/achievementController');

router.get('/', getAchievements);

router.post('/', createAchievement);

router.put('/:id', updateAchievement);

router.delete('/:id', deleteAchievement);

module.exports = router;