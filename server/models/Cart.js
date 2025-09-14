// models/Cart.js
const mongoose = require("mongoose");

const CartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        size: {
          type: String,
          default: null, // null when product has no sizes or not selected
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
      },
    ],
  },
  { timestamps: true }
);

// Helpful for queries like: find cart line for this product+size
CartSchema.index({ userId: 1, "items.productId": 1, "items.size": 1 });

module.exports = mongoose.model("Cart", CartSchema);
