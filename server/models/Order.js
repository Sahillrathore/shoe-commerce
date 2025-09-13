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

const OrderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    cartId: { type: String },
    cartItems: [
      {
        productId: String,
        title: String,
        image: String,
        price: Number,
        quantity: Number,
      },
    ],
    addressInfo: {
      addressId: String,
      address: String,
      city: String,
      pincode: String,
      phone: String,
      notes: String,
    },
    orderStatus: String,
    paymentMethod: String, // 'cod' | 'upi'
    paymentStatus: String,
    pricing: PricingSchema, // ✅
    totalAmount: Number, // duplicate for convenience
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
