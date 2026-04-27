const mongoose = require('mongoose');

const returnItemSchema = new mongoose.Schema(
  {
    key:       { type: String },
    name:      { type: String },
    name_ar:   { type: String },
    name_en:   { type: String },
    price:     { type: Number, default: 0 },
    qty:       { type: Number },
    returnQty: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const returnSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    shop:    { type: String, required: true },
    items:   { type: [returnItemSchema], required: true },
    total:   { type: Number, required: true, min: 0 },
    reason:  { type: String, default: '' },
    type:    { type: String, default: '' },
    status:  { type: String, enum: ['Pending', 'Resolved'], default: 'Pending' },
    date:    { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Return', returnSchema);
