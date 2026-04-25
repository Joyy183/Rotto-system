const express = require('express');
const Return  = require('../models/Return');
const Order   = require('../models/Order');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

function serialize(doc) {
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  obj.id = obj._id?.toString() || obj.id;
  delete obj._id; delete obj.__v;
  if (obj.date) obj.date = new Date(obj.date).toISOString();
  return obj;
}

// ── POST /api/returns ──────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { orderId, items, total, reason } = req.body;
    if (!orderId || !items || !total) {
      return res.status(400).json({ error: 'orderId, items and total are required' });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Shops can only return their own orders
    if (req.user.role === 'shop' && order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not your order' });
    }

    const ret = await Return.create({
      orderId,
      shop:   order.shop,
      items,
      total,
      reason: reason || '',
    });

    await Order.findByIdAndUpdate(orderId, { hasReturn: true, returnStatus: 'Pending' });

    const serialized = serialize(ret);
    req.app.get('io')?.emit('returnCreated', serialized);
    return res.status(201).json(serialized);
  } catch (err) {
    console.error('[POST /returns]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/returns ───────────────────────────────────────────────────────
// Admin: all | Shop: own
router.get('/', async (req, res) => {
  try {
    let docs;
    if (req.user.role === 'admin' || req.user.role === 'staff') {
      docs = await Return.find().sort({ date: -1 });
    } else {
      // find orders belonging to this shop, then returns for those orders
      const myOrders = await Order.find({ userId: req.user._id }).select('_id');
      const ids = myOrders.map(o => o._id);
      docs = await Return.find({ orderId: { $in: ids } }).sort({ date: -1 });
    }
    return res.json(docs.map(serialize));
  } catch (err) {
    console.error('[GET /returns]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
