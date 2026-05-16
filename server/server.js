const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

require('dotenv').config();

const app = express();
const server = http.createServer(app);

/* =========================
   SOCKET.IO
========================= */
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
});
app.set('io', io);
io.on('connection', (socket) => {
  console.log(`⚡ User Connected: ${socket.id}`);
  socket.on('disconnect', () => console.log(`❌ User Disconnected: ${socket.id}`));
});

/* =========================
   MIDDLEWARE
========================= */
app.use(cors());
app.use(express.json());
// app.use('/uploads', express.static('uploads'));

/* =========================
   MONGODB
========================= */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => console.log(err));

/* =========================
   AUTH (no token needed)
========================= */
app.use('/api/auth', require('./routes/authRoutes'));

/* =========================
   AUTH MIDDLEWARE
   Import once, apply to every
   write route below.
========================= */
const { verifyToken } = require('./middleware/authMiddleware');

/* =========================
   PUBLIC READ ROUTES
   GET requests — no token needed
   so the website can load data.
========================= */
const playerRouter      = require('./routes/playerRoutes');
const achievementRouter = require('./routes/achievementRoutes');
const galleryRouter     = require('./routes/galleryRoutes');
const tournamentRouter  = require('./routes/tournamentRoutes');
const contactRouter     = require('./routes/ContactRoutes');

// Public GETs
app.get('/api/players',      playerRouter);
app.get('/api/achievements', achievementRouter);
app.get('/api/gallery',      galleryRouter);
app.get('/api/tournaments',  tournamentRouter);

// Contact form — public POST (visitors can submit)
app.use('/api/contact', contactRouter);

/* =========================
   PROTECTED WRITE ROUTES
   All POST / PUT / DELETE
   require a valid JWT.
========================= */
// ✅ Just mount normally — auth is handled inside each router
app.use('/api/players',      require('./routes/playerRoutes'));
app.use('/api/achievements', require('./routes/achievementRoutes'));
app.use('/api/gallery',      require('./routes/galleryRoutes'));
app.use('/api/tournaments',  require('./routes/tournamentRoutes'));
app.use('/api/contact',      require('./routes/ContactRoutes'));
app.use('/api/auth',         require('./routes/authRoutes'));

/* =========================
   ROOT
========================= */
app.get('/', (req, res) => res.send('IDC Backend Running'));

/* =========================
   SERVER
========================= */
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));