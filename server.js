// ══════════════════════════════════════════════════════════════════════════
//  ROTTO SYSTEM – Express + Socket.io Server
// ══════════════════════════════════════════════════════════════════════════
require('dotenv').config();

const express    = require('express');
const http       = require('http');
const cors       = require('cors');
const mongoose   = require('mongoose');
const { Server } = require('socket.io');

// ── Routes ────────────────────────────────────────────────────────────────
const authRoutes    = require('./routes/auth');
const adminRoutes   = require('./routes/admin');
const ordersRoutes  = require('./routes/orders');
const returnsRoutes = require('./routes/returns');
const supportRoutes = require('./routes/support');

const app    = express();
const server = http.createServer(app);

// ── Socket.io ─────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  },
});

// Make io available inside route handlers via req.app.get('io')
app.set('io', io);

io.on('connection', socket => {
  console.log('[Socket.io] client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('[Socket.io] client disconnected:', socket.id);
  });
});

// ── Middleware ────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Security headers (basic, no helmet dependency)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

// ── Health check ──────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// ── API Routes ────────────────────────────────────────────────────────────
app.use('/api',          authRoutes);
app.use('/api/admin',    adminRoutes);
app.use('/api/orders',   ordersRoutes);
app.use('/api/returns',  returnsRoutes);
app.use('/api/support',  supportRoutes);

// ── 404 handler ───────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// ── Global error handler ──────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[Unhandled Error]', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── MongoDB + start ───────────────────────────────────────────────────────
const PORT = process.env.PORT || 8080;

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser:    true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log('[MongoDB] connected:', process.env.MONGO_URI);

    // Seed default admin accounts if they don't exist yet
    await seedAdmins();

    server.listen(PORT, () =>
      console.log(`[Server] running on http://localhost:${PORT}`)
    );
  })
  .catch(err => {
    console.error('[MongoDB] connection error:', err.message);
    process.exit(1);
  });

// ── Seed admin accounts ───────────────────────────────────────────────────
async function seedAdmins() {
  const User = require('./models/User');
  const emails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

  for (const email of emails) {
    const exists = await User.findOne({ email });
    if (!exists) {
      await User.create({
        email,
        password: 'Admin@2026!',   // ← CHANGE THIS after first login!
        role:     'admin',
        shopName: '',
      });
      console.log(`[Seed] Admin created: ${email}  (default password: Admin@2026!)`);
    }
  }
}
