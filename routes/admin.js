const express = require('express');
const User = require('../models/User');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

// All admin routes require a valid JWT + admin role
router.use(protect, requireRole('admin'));

// ── POST /api/admin/create-user ────────────────────────────────────────────
// Admin creates a new Shop account (shops cannot self-register)
router.post('/create-user', async (req, res) => {
  try {
    const { email, password, shopName } = req.body;

    if (!email || !password || !shopName) {
      return res.status(400).json({ error: 'email, password and shopName are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const user = await User.create({
      email:    email.toLowerCase().trim(),
      password,           // hashed by pre-save hook in model
      role:     'shop',
      shopName: shopName.trim(),
    });

    // Emit socket event so admin panel updates in real time
    req.app.get('io')?.emit('shopCreated', { id: user._id, shopName: user.shopName });

    return res.status(201).json({
      message: 'Shop account created',
      user: { id: user._id, email: user.email, shopName: user.shopName, role: user.role },
    });
  } catch (err) {
    console.error('[POST /admin/create-user]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/admin/shops ───────────────────────────────────────────────────
// Returns list of all shop accounts (for dropdown / shops page)
router.get('/shops', async (req, res) => {
  try {
    const shops = await User.find({ role: 'shop' }).select('email shopName createdAt');
    return res.json(shops);
  } catch (err) {
    console.error('[GET /admin/shops]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ── DELETE /api/admin/shops/:id ────────────────────────────────────────────
router.delete('/shops/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    req.app.get('io')?.emit('shopDeleted', { id: req.params.id });
    return res.json({ message: 'Shop deleted' });
  } catch (err) {
    console.error('[DELETE /admin/shops/:id]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
