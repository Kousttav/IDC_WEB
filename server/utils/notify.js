const Notification = require('../models/Notification');

async function notify(io, { type, title, message, meta = {} }) {
  const notif = await Notification.create({ type, title, message, meta });
  io?.emit('notification', notif);  // push to all connected clients live
  return notif;
}

module.exports = notify;