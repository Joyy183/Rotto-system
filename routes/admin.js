const express = require('express');
const User = require('../models/User');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

// Admin routes are available to admins and staff, then narrowed by permissions.
router.use(protect, requireRole('admin', 'staff'));

function isAdmin(req) {
  return req.user.role === 'admin';
}

function hasStaffPermission(req, key) {
  if (isAdmin(req)) return true;
  return req.user.permissions?.[key] === true;
}

// ── POST /api/admin/create-user ────────────────────────────────────────────
// Admin creates a new Shop account (shops cannot self-register)
router.post('/create-user', async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Only admins can create users' });

    const { email, password, shopName, staffName, staffRole, permissions } = req.body;
    const role = req.body.role || 'shop';

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    if (!['shop', 'staff'].includes(role)) {
      return res.status(400).json({ error: 'role must be shop or staff' });
    }
    if (role === 'shop' && !shopName) {
      return res.status(400).json({ error: 'shopName is required' });
    }
    if (role === 'staff' && (!staffName || !staffRole)) {
      return res.status(400).json({ error: 'staffName and staffRole are required' });
    }
    if (role === 'staff' && !['full_admin', 'orders_mgr', 'cashier', 'viewer', 'custom'].includes(staffRole)) {
      return res.status(400).json({ error: 'Valid staffRole required' });
    }

    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const user = await User.create({
      email:    email.toLowerCase().trim(),
      password,           // hashed by pre-save hook in model
      role,
      shopName: role === 'shop' ? shopName.trim() : '',
      staffName: role === 'staff' ? staffName.trim() : '',
      staffRole: role === 'staff' ? staffRole : '',
      permissions: permissions || {},
    });

    if (role === 'shop') {
      req.app.get('io')?.emit('shopCreated', { id: user._id, shopName: user.shopName });
    }

    return res.status(201).json({
      message: role === 'staff' ? 'Staff account created' : 'Shop account created',
      user: {
        id: user._id,
        email: user.email,
        shopName: user.shopName,
        role: user.role,
        staffName: user.staffName,
        staffRole: user.staffRole,
        permissions: user.permissions || {},
      },
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
    if (!hasStaffPermission(req, 'canSeeShops')) return res.status(403).json({ error: 'Forbidden' });

    const shops = await User.find({ role: 'shop' }).select('email shopName createdAt');
    return res.json(shops);
  } catch (err) {
    console.error('[GET /admin/shops]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/admin/staff ──────────────────────────────────────────────────
router.get('/staff', async (req, res) => {
  try {
    if (!hasStaffPermission(req, 'canSeeStaff')) return res.status(403).json({ error: 'Forbidden' });

    const staff = await User.find({ role: 'staff' }).select('email staffName staffRole permissions createdAt');
    return res.json(staff);
  } catch (err) {
    console.error('[GET /admin/staff]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ── DELETE /api/admin/staff/:id ───────────────────────────────────────────
router.delete('/staff/:id', async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Only admins can delete staff' });

    const staff = await User.findOneAndDelete({ _id: req.params.id, role: 'staff' });
    if (!staff) return res.status(404).json({ error: 'Staff user not found' });

    return res.json({ message: 'Staff user deleted' });
  } catch (err) {
    console.error('[DELETE /admin/staff/:id]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ── DELETE /api/admin/shops/:id ────────────────────────────────────────────
router.delete('/shops/:id', async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Only admins can delete shops' });

    await User.findOneAndDelete({ _id: req.params.id, role: 'shop' });
    req.app.get('io')?.emit('shopDeleted', { id: req.params.id });
    return res.json({ message: 'Shop deleted' });
  } catch (err) {
    console.error('[DELETE /admin/shops/:id]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ── PATCH /api/admin/shops/:id/password ───────────────────────────────────
// Admin changes a shop's password
router.patch('/shops/:id/password', async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Only admins can reset passwords' });

    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const user = await User.findById(req.params.id);
    if (!user || user.role === 'admin') return res.status(404).json({ error: 'Shop not found' });

    user.password = password; // hashed by pre-save hook
    await user.save();

    return res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('[PATCH /admin/shops/:id/password]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ── PUT /api/admin/shops/:id ───────────────────────────────────────────────
// Admin updates shop name and/or email
router.put('/shops/:id', async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Only admins can update shops' });

    const { shopName, email, permissions } = req.body;
    const update = {};
    if (shopName) update.shopName = shopName.trim();
    if (email)    update.email    = email.toLowerCase().trim();
    if (permissions) update.permissions = permissions;

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!user) return res.status(404).json({ error: 'Shop not found' });

    return res.json({
      message: 'Shop updated',
      user: { id: user._id, email: user.email, shopName: user.shopName },
    });
  } catch (err) {
    console.error('[PUT /admin/shops/:id]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
