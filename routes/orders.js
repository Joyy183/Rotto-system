const express = require('express');
const Order   = require('../models/Order');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// ── Helper: serialise order for frontend (keeps "date" as ISO string) ──────
function serializeOrder(o) {
  const obj = o.toObject ? o.toObject() : { ...o };
  // Rename _id → id so the frontend can use o.id
  obj.id = obj._id?.toString() || obj.id;
  delete obj._id;
  delete obj.__v;
  // Ensure date is ISO string (frontend uses o.date everywhere)
  if (obj.date) obj.date = new Date(obj.date).toISOString();
  return obj;
}

// ── POST /api/orders ───────────────────────────────────────────────────────
// Shop submits a new order
router.post('/', requireRole('shop'), async (req, res) => {
  try {
    const { items, total } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array is required' });
    }
    if (total === undefined || total < 0) {
      return res.status(400).json({ error: 'total is required and must be >= 0' });
    }

    const order = await Order.create({
      userId:   req.user._id,
      shop:     req.user.shopName,   // NEVER trust frontend for identity
      items,
      total,
      date:     new Date(),
      status:   'Pending',
    });

    const serialized = serializeOrder(order);

    // Real-time: notify admin of new order
    req.app.get('io')?.emit('orderCreated', serialized);

    return res.status(201).json(serialized);
  } catch (err) {
    console.error('[POST /orders]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/orders ────────────────────────────────────────────────────────
// Admin: all non-archived orders | Shop: own orders only
router.get('/', async (req, res) => {
  try {
    let query = {};

    if (req.user.role === 'shop') {
      query.userId = req.user._id;
    }
    // Admin sees everything (including archived if ?archived=true)
    if (req.query.archived !== 'true') {
      query.archived = { $ne: true };
    }

    const orders = await Order.find(query).sort({ date: -1 });
    return res.json(orders.map(serializeOrder));
  } catch (err) {
    console.error('[GET /orders]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ── PUT /api/orders/:id ────────────────────────────────────────────────────
// Update status (admin) or cancel own pending order (shop)
router.put('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const { status, items, total } = req.body;
    const now = new Date();

    // ── Shop can only cancel their own Pending orders ──────────────────────
    if (req.user.role === 'shop') {
      if (order.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Not your order' });
      }
      if (status !== 'Cancelled') {
        return res.status(403).json({ error: 'Shops can only cancel orders' });
      }
      if (order.status !== 'Pending') {
        return res.status(400).json({ error: 'Can only cancel Pending orders' });
      }
      order.status = 'Cancelled';
      order.cancelledTime = now;
      await order.save();

      const serialized = serializeOrder(order);
      req.app.get('io')?.emit('orderUpdated', serialized);
      return res.json(serialized);
    }

    // ── Admin can update anything ──────────────────────────────────────────
    if (req.user.role === 'admin') {
      if (status) {
        order.status = status;
        if (status === 'Preparing' || status === 'Partial Accept') order.preparingTime = now;
        if (status === 'Delivered')  order.deliveredTime  = now;
        if (status === 'Cancelled')  order.cancelledTime  = now;
      }
      // Partial accept may send updated items + total
      if (items && Array.isArray(items)) order.items = items;
      if (total !== undefined) order.total = total;

      await order.save();
      const serialized = serializeOrder(order);
      req.app.get('io')?.emit('orderUpdated', serialized);
      return res.json(serialized);
    }

    return res.status(403).json({ error: 'Forbidden' });
  } catch (err) {
    console.error('[PUT /orders/:id]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/orders/archive ───────────────────────────────────────────────
// Admin: move completed orders to archive collection
router.post('/archive', requireRole('admin'), async (req, res) => {
  try {
    const Archive = require('../models/Archive');
    const toArchive = await Order.find({
      status: { $in: ['Delivered', 'Cancelled', 'Partial Accept'] },
      archived: { $ne: true },
    });

    if (!toArchive.length) {
      return res.status(400).json({ error: 'Nothing to archive' });
    }

    const now = new Date();
    const archiveDocs = toArchive.map(o => ({
      originalId: o._id,
      userId:     o.userId,
      shop:       o.shop,
      items:      o.items,
      total:      o.total,
      status:     o.status,
      date:       o.date,
      archivedAt: now,
    }));

    await Archive.insertMany(archiveDocs);
    await Order.updateMany(
      { _id: { $in: toArchive.map(o => o._id) } },
      { $set: { archived: true, archivedAt: now } }
    );

    req.app.get('io')?.emit('ordersArchived', { count: toArchive.length });
    return res.json({ archived: toArchive.length });
  } catch (err) {
    console.error('[POST /orders/archive]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/orders/archive ────────────────────────────────────────────────
router.get('/archive', requireRole('admin'), async (req, res) => {
  try {
    const Archive = require('../models/Archive');
    const docs = await Archive.find().sort({ archivedAt: -1 });
    const result = docs.map(d => {
      const obj = d.toObject();
      obj.id = obj._id?.toString();
      delete obj._id; delete obj.__v;
      if (obj.date) obj.date = new Date(obj.date).toISOString();
      if (obj.archivedAt) obj.archivedAt = new Date(obj.archivedAt).toISOString();
      return obj;
    });
    return res.json(result);
  } catch (err) {
    console.error('[GET /orders/archive]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
