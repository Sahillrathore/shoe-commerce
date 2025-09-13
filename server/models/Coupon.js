const mongoose = require("mongoose");

const CouponSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, required: true, uppercase: true, trim: true },
    type: { type: String, enum: ["flat", "percent"], required: true }, // flat = ₹X, percent = % off
    value: { type: Number, required: true }, // amount or percentage
    minOrder: { type: Number, default: 0 }, // minimum subtotal
    maxDiscount: { type: Number }, // percent cap (optional)
    startAt: { type: Date, default: Date.now },
    endAt: { type: Date }, // optional
    active: { type: Boolean, default: true },
    usageLimit: { type: Number }, // global cap (optional)
    usedCount: { type: Number, default: 0 },
    perUserLimit: { type: Number, default: 1 }, // simple per-user cap
  },
  { timestamps: true }
);

module.exports = mongoose.model("Coupon", CouponSchema);
