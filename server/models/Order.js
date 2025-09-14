const mongoose = require("mongoose");

const PricingSchema = new mongoose.Schema(
  {
    subtotal: Number,
    coupon: {
      code: String,
      discount: Number,
    },
    upiDiscount: Number,
    finalAmount: Number,
  },
  { _id: false }
);

const OrderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },                 // was String → ObjectId (optional but recommended)
    title: String,     // snapshot for convenience
    image: String,     // snapshot for convenience
    price: { type: Number, required: true },    // price at purchase
    quantity: { type: Number, required: true, min: 1 },
    size: { type: String, default: null },      // <-- NEW: selected size (nullable)
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    cartId: { type: String },
    cartItems: [OrderItemSchema],               // <-- includes size
    addressInfo: {
      addressId: String,
      address: String,
      city: String,
      pincode: String,
      phone: String,
      notes: String,
    },
    orderStatus: { type: String, default: "confirmed" },
    paymentMethod: { type: String, enum: ["cod", "upi"], required: true },
    paymentStatus: { type: String, default: "pending" },
    pricing: PricingSchema,
    totalAmount: Number,
    orderDate: Date,
    orderUpdateDate: Date,
    paymentMeta: {
      upiId: String,
      upiName: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", OrderSchema);
