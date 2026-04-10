const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    from:  { type: String, required: true },   // 'user' | 'admin' | 'ai'
    text:  { type: String, required: true },
    time:  { type: Date, default: Date.now },
  },
  { _id: false }
);

const supportSchema = new mongoose.Schema(
  {
    shopId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    shopName: { type: String, required: true },
    messages: { type: [messageSchema], default: [] },
    hasNew:   { type: Boolean, default: false },   // true = admin has unread messages
  },
  { timestamps: true }
);

module.exports = mongoose.model('Support', supportSchema);
