const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// ── POST /api/login ────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      // Constant-time response to prevent user enumeration
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.json({
      token,
      user: {
        id:       user._id,
        email:    user.email,
        role:     user.role,
        shopName: user.shopName,
        staffName: user.staffName,
        staffRole: user.staffRole,
        permissions: user.permissions || {},
      },
    });
  } catch (err) {
    console.error('[POST /login]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
