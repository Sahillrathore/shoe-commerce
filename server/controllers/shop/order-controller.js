const paypal = require("../../helpers/paypal");
const Order = require("../../models/Order");
const Cart = require("../../models/Cart");
const Product = require("../../models/Product");

const Coupon = require("../../models/Coupon");

function computeDiscount(coupon, subtotal) {
  if (coupon.type === "flat") return Math.min(subtotal, Math.max(0, coupon.value));
  const raw = (subtotal * coupon.value) / 100;
  return Math.min(
    subtotal,
    Math.max(0, coupon.maxDiscount ? Math.min(raw, coupon.maxDiscount) : raw)
  );
}

const createOrder = async (req, res) => {
  try {
    const {
      userId,
      cartItems = [],
      addressInfo = {},
      paymentMethod, // 'cod' | 'upi'
      orderStatus,
      paymentStatus,
      pricing, // { subtotal, coupon: {code}, upiDiscount, finalAmount } - client hint only
      cartId,
      orderDate,
      orderUpdateDate,
      paymentMeta,
    } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: "userId required" });
    }
    if (!Array.isArray(cartItems) || !cartItems.length) {
      return res.status(400).json({ success: false, message: "Empty cart" });
    }
    if (!["cod", "upi"].includes(paymentMethod)) {
      return res.status(400).json({ success: false, message: "Invalid payment method" });
    }

    // --- Validate each cart item & normalize fields (including size) ---
    // We trust DB for product existence & (optionally) size validity.
    const dbProducts = await Product.find({
      _id: { $in: cartItems.map((it) => it.productId) }
    }).lean();

    const productMap = new Map(dbProducts.map((p) => [String(p._id), p]));

    const normalizedItems = [];
    for (const it of cartItems) {
      const pid = String(it.productId || "");
      const qty = Number(it.quantity || 0);
      const price = Number(it.price || 0); // you may also recompute from DB if needed
      const size = it.size === undefined || it.size === "" ? null : String(it.size);

      if (!pid || qty <= 0 || price < 0) {
        return res.status(400).json({ success: false, message: "Invalid cart item" });
      }

      const prod = productMap.get(pid);
      if (!prod) {
        return res.status(400).json({ success: false, message: "Product not found in cart" });
      }

      // If product has sizes configured, require a valid size
      if (Array.isArray(prod.size) && prod.size.length > 0) {
        if (!size) {
          return res.status(400).json({ success: false, message: `Size required for product ${prod.title}` });
        }
        const allowed = prod.size
          .flatMap(s => String(s).split(","))
          .map(s => s.trim())
          .filter(Boolean);
        if (!new Set(allowed).has(size)) {
          return res.status(400).json({ success: false, message: `Invalid size '${size}' for product ${prod.title}` });
        }
      }

      normalizedItems.push({
        productId: pid,
        title: it.title,     // kept if you send it
        image: it.image,     // kept if you send it
        price,               // price at purchase (or recompute from DB if you prefer)
        quantity: qty,
        size,                // <-- persist size
      });
    }

    // recompute subtotal from sanitized items
    const subtotal = normalizedItems.reduce(
      (sum, it) => sum + Number(it.price) * Number(it.quantity),
      0
    );

    // coupon validation (server source of truth)
    let couponObj = null;
    let couponDiscount = 0;
    if (pricing?.coupon?.code) {
      const coupon = await Coupon.findOne({ code: String(pricing.coupon.code).toUpperCase() });
      const now = new Date();
      if (
        coupon &&
        coupon.active &&
        (!coupon.startAt || now >= coupon.startAt) &&
        (!coupon.endAt || now <= coupon.endAt) &&
        subtotal >= (coupon.minOrder || 0) &&
        (!coupon.usageLimit || coupon.usedCount < coupon.usageLimit)
      ) {
        couponDiscount = Math.floor(computeDiscount(coupon, subtotal));
        couponObj = { code: coupon.code, discount: couponDiscount };
      }
    }

    // one-offer-only rule handled on client; server still enforces UPI discount if method is UPI
    const upiDiscount = paymentMethod === "upi" ? 100 : 0;

    const finalAmount = Math.max(0, subtotal - couponDiscount - upiDiscount);

    const doc = {
      userId,
      cartId,
      cartItems: normalizedItems,    // <-- includes size
      addressInfo,
      orderStatus: orderStatus || "confirmed",
      paymentMethod,
      paymentStatus: paymentStatus || "pending",
      pricing: {
        subtotal,
        coupon: couponObj,
        upiDiscount,
        finalAmount,
      },
      totalAmount: finalAmount,
      orderDate: orderDate || new Date(),
      orderUpdateDate: orderUpdateDate || new Date(),
      paymentMeta: paymentMeta || undefined,
    };

    const order = new Order(doc);
    await order.save();

    // increment coupon usage (simple global count)
    if (couponObj) {
      await Coupon.updateOne(
        { code: couponObj.code },
        { $inc: { usedCount: 1 } }
      );
    }

    // --- OPTIONAL: decrement stock (supports per-size stock array) ---
    // for (const it of normalizedItems) {
    //   const prod = await Product.findById(it.productId);
    //   if (!prod) continue;
    //   if (Array.isArray(prod.sizeStock) && prod.sizeStock.length && it.size) {
    //     const idx = prod.sizeStock.findIndex(r => String(r.size) === String(it.size));
    //     if (idx > -1) {
    //       if (prod.sizeStock[idx].stock < it.quantity) {
    //         return res.status(400).json({ success: false, message: `Insufficient stock for size ${it.size}` });
    //       }
    //       prod.sizeStock[idx].stock -= it.quantity;
    //     }
    //   } else if (typeof prod.totalStock === 'number') {
    //     if (prod.totalStock < it.quantity) {
    //       return res.status(400).json({ success: false, message: `Insufficient stock` });
    //     }
    //     prod.totalStock -= it.quantity;
    //   }
    //   await prod.save();
    // }

    return res.status(201).json({
      success: true,
      message: "Order created successfully",
      orderId: order._id,
      data: order,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: "Some error occurred!" });
  }
};

const capturePayment = async (req, res) => {
  try {
    const { paymentId, payerId, orderId } = req.body;

    let order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order can not be found",
      });
    }

    order.paymentStatus = "paid";
    order.orderStatus = "confirmed";
    order.paymentId = paymentId;
    order.payerId = payerId;

    for (let item of order.cartItems) {
      let product = await Product.findById(item.productId);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Not enough stock for this product ${product.title}`,
        });
      }

      product.totalStock -= item.quantity;

      await product.save();
    }

    const getCartId = order.cartId;
    await Cart.findByIdAndDelete(getCartId);

    await order.save();

    res.status(200).json({
      success: true,
      message: "Order confirmed",
      data: order,
    });
  } catch (e) {
    console.log(e);
    res.status(500).json({
      success: false,
      message: "Some error occured!",
    });
  }
};

const getAllOrdersByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const orders = await Order.find({ userId });

    if (!orders.length) {
      return res.status(404).json({
        success: false,
        message: "No orders found!",
      });
    }

    res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (e) {
    console.log(e);
    res.status(500).json({
      success: false,
      message: "Some error occured!",
    });
  }
};

const getOrderDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found!",
      });
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (e) {
    console.log(e);
    res.status(500).json({
      success: false,
      message: "Some error occured!",
    });
  }
};

module.exports = {
  createOrder,
  capturePayment,
  getAllOrdersByUser,
  getOrderDetails,
};
