const express = require('express');
const Support = require('../models/Support');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

function serialize(doc) {
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  obj.id = obj._id?.toString() || obj.id;
  delete obj._id; delete obj.__v;
  return obj;
}

// ── GET /api/support ───────────────────────────────────────────────────────
// Admin: all threads | Shop: own thread
router.get('/', async (req, res) => {
  try {
    let docs;
    if (req.user.role === 'admin' || req.user.role === 'staff') {
      docs = await Support.find().sort({ updatedAt: -1 });
    } else {
      const thread = await Support.findOne({ shopId: req.user._id });
      docs = thread ? [thread] : [];
    }
    return res.json(docs.map(serialize));
  } catch (err) {
    console.error('[GET /support]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/support/message ──────────────────────────────────────────────
// Shop sends a message (creates thread if not exists)
router.post('/message', requireRole('shop'), async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'text is required' });

    let thread = await Support.findOne({ shopId: req.user._id });
    if (!thread) {
      thread = await Support.create({
        shopId:   req.user._id,
        shopName: req.user.shopName,
        messages: [],
      });
    }

    const msg = { from: 'user', text, time: new Date() };
    thread.messages.push(msg);
    thread.hasNew = true;
    await thread.save();

    const serialized = serialize(thread);
    req.app.get('io')?.emit('supportMessage', serialized);
    return res.json(serialized);
  } catch (err) {
    console.error('[POST /support/message]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/support/:threadId/reply ─────────────────────────────────────
// Admin replies to a thread
router.post('/:threadId/reply', requireRole('admin', 'staff'), async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'text is required' });

    const thread = await Support.findById(req.params.threadId);
    if (!thread) return res.status(404).json({ error: 'Thread not found' });

    thread.messages.push({ from: 'admin', text, time: new Date() });
    thread.hasNew = false;
    await thread.save();

    const serialized = serialize(thread);
    req.app.get('io')?.emit('supportReply', serialized);
    return res.json(serialized);
  } catch (err) {
    console.error('[POST /support/:threadId/reply]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ── PATCH /api/support/:threadId/read ─────────────────────────────────────
// Admin marks thread as read
router.patch('/:threadId/read', requireRole('admin', 'staff'), async (req, res) => {
  try {
    await Support.findByIdAndUpdate(req.params.threadId, { hasNew: false });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
