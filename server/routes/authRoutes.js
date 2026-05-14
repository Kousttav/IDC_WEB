const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/authMiddleware');

const router = express.Router();

/* ══════════════════════════════════════════════════════════════
  HARDCODED USERS  — only these three can ever log in.
  Passwords are bcrypt-hashed at server startup (cost factor 12).
  Plain-text passwords never leave this file after startup.
══════════════════════════════════════════════════════════════ */
const RAW_USERS = [
  { username: 'DTPRITAMIDCOWNER211',    password: 'idcowner211@2005'   },
  { username: 'DTMAYUKHIDCCOOWNER733',  password: 'idccoowner733@2005' },
  { username: 'DTKOUSTTAVIDCDEV415',    password: 'idcdev415@2005'     },
];

// Hashed at startup — async IIFE so the server is ready before requests come in.
let USERS = [];
(async () => {
  USERS = await Promise.all(
    RAW_USERS.map(async (u) => ({
      username: u.username,
      hash: await bcrypt.hash(u.password, 12),
    }))
  );
  console.log('✅ Auth: hardcoded user hashes ready');
})();

/* ══════════════════════════════════════════════════════════════
  POST /api/auth/login
  Body: { username, password }
  Returns: { token }   (JWT, expires in 8 h)
══════════════════════════════════════════════════════════════ */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    // Find user (case-sensitive — usernames are fixed strings)
    const user = USERS.find((u) => u.username === username);
    if (!user) {
      // Return the same message whether username or password is wrong
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const match = await bcrypt.compare(password, user.hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '8h' });
    return res.json({ token });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;