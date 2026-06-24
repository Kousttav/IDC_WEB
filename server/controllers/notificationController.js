const Notification = require('../models/Notification');

// GET all — newest first
exports.getNotifications = async (req, res) => {
  try {
    const data = await Notification.find().sort({ createdAt: -1 }).limit(50);
    res.json(data);
  } catch (err) {
    res.status(500).json(err);
  }
};

// PATCH mark one as read
exports.markRead = async (req, res) => {
  try {
    const notif = await Notification.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );
    res.json(notif);
  } catch (err) {
    res.status(500).json(err);
  }
};

// PATCH mark ALL as read
exports.markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ read: false }, { read: true });
    res.json({ message: 'All marked as read' });
  } catch (err) {
    res.status(500).json(err);
  }
};

// DELETE one
exports.deleteNotification = async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json(err);
  }
};

// DELETE all
exports.clearAll = async (req, res) => {
  try {
    await Notification.deleteMany({});
    res.json({ message: 'All cleared' });
  } catch (err) {
    res.status(500).json(err);
  }
};