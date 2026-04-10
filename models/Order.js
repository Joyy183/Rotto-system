const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema(
  {
    key:      { type: String },
    name:     { type: String },
    name_ar:  { type: String },
    name_en:  { type: String },
    price:    { type: Number, default: 0 },
    qty:      { type: Number, required: true, min: 1 },
    returnQty:{ type: Number },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    shop:     { type: String, required: true },         // shopName – denormalised for fast display
    items:    { type: [itemSchema], required: true },
    total:    { type: Number, required: true, min: 0 },
    status:   {
      type: String,
      enum: ['Pending', 'Preparing', 'Partial Accept', 'Delivered', 'Cancelled'],
      default: 'Pending',
    },
    archived:       { type: Boolean, default: false },
    archivedAt:     { type: Date },
    hasReturn:      { type: Boolean, default: false },
    returnStatus:   { type: String },
    preparingTime:  { type: Date },
    deliveredTime:  { type: Date },
    cancelledTime:  { type: Date },
    date:           { type: Date, default: Date.now },   // kept as "date" to match frontend field
  },
  { timestamps: true }
);

// Virtual so the frontend can use either o.date or o.createdAt
orderSchema.virtual('dateISO').get(function () {
  return (this.date || this.createdAt).toISOString();
});

module.exports = mongoose.model('Order', orderSchema);
