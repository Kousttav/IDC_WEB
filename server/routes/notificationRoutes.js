const router = require('express').Router();
const {
  getNotifications,
  markRead,
  markAllRead,
  deleteNotification,
  clearAll,
} = require('../controllers/notificationController');

router.get('/',              getNotifications);
router.patch('/:id/read',    markRead);
router.patch('/read-all',    markAllRead);
router.delete('/:id',        deleteNotification);
router.delete('/',           clearAll);

module.exports = router;