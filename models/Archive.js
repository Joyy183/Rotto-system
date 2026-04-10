const mongoose = require('mongoose');

// Archive is a snapshot copy of an order document
const archiveSchema = new mongoose.Schema(
  {
    originalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    shop:       { type: String },
    items:      { type: Array, default: [] },
    total:      { type: Number, default: 0 },
    status:     { type: String },
    date:       { type: Date },
    archivedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

module.exports = mongoose.model('Archive', archiveSchema);
