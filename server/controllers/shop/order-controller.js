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
      pricing, // { subtotal, coupon: {code}, upiDiscount, finalAmount } from client (will recompute)
      cartId,
      orderDate,
      orderUpdateDate,
      paymentMeta,
    } = req.body;

    if (!userId) return res.status(400).json({ success: false, message: "userId required" });
    if (!Array.isArray(cartItems) || !cartItems.length)
      return res.status(400).json({ success: false, message: "Empty cart" });
    if (!["cod", "upi"].includes(paymentMethod))
      return res.status(400).json({ success: false, message: "Invalid payment method" });

    // recompute subtotal from items
    const subtotal = cartItems.reduce(
      (sum, it) => sum + Number(it.price || 0) * Number(it.quantity || 0),
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

    // upi discount
    const upiDiscount = paymentMethod === "upi" ? 100 : 0;

    const finalAmount = Math.max(0, subtotal - couponDiscount - upiDiscount);

    const doc = {
      userId,
      cartId,
      cartItems,
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
