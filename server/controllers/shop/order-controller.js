const paypal = require("../../helpers/paypal");
const Order = require("../../models/Order");
const Cart = require("../../models/Cart");
const Product = require("../../models/Product");

const createOrder = async (req, res) => {
  try {
    const {
      userId,
      cartItems = [],
      addressInfo = {},
      paymentMethod,             // 'cod' | 'upi'
      totalAmount,

      // optional / legacy fields
      orderStatus,
      paymentStatus,
      orderDate,
      orderUpdateDate,
      paymentId,
      payerId,
      cartId,

      // ✅ NEW: carry UPI details here when method = 'upi'
      paymentMeta,               // { upiId: string, upiName: string }
    } = req.body;

    // ---------- Basic validation ----------
    if (!userId) {
      return res.status(400).json({ success: false, message: "userId is required" });
    }
    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ success: false, message: "cartItems cannot be empty" });
    }
    if (!addressInfo?.address || !addressInfo?.city || !addressInfo?.pincode || !addressInfo?.phone) {
      return res.status(400).json({ success: false, message: "addressInfo is incomplete" });
    }
    // 10-digit phone
    if (!/^\d{10}$/.test(String(addressInfo.phone || "").trim())) {
      return res.status(400).json({ success: false, message: "Invalid phone (must be 10 digits)" });
    }
    if (!["cod", "upi"].includes(paymentMethod)) {
      return res.status(400).json({ success: false, message: "Invalid paymentMethod" });
    }

    // UPI-specific validation
    if (paymentMethod === "upi") {
      const upiId = String(paymentMeta?.upiId || "").trim();
      const upiName = String(paymentMeta?.upiName || "").trim();
      const upiRegex = /^[\w.\-]{2,}@[A-Za-z]{2,}$/; // e.g. name@upi
      if (!upiId || !upiRegex.test(upiId) || !upiName) {
        return res.status(400).json({
          success: false,
          message: "Invalid UPI details (provide valid upiId like name@upi and upiName)",
        });
      }
    }

    // ---------- Derive statuses ----------
    // You can customize these defaults as needed
    const derivedOrderStatus = orderStatus || "confirmed";
    const derivedPaymentStatus =
      paymentStatus || (paymentMethod === "cod" ? "pending" : "pending"); // keep 'pending' until captured/verified

    // ---------- Build and save order ----------
    const doc = {
      userId,
      cartId,
      cartItems,
      addressInfo,
      orderStatus: derivedOrderStatus,
      paymentMethod,
      paymentStatus: derivedPaymentStatus,
      totalAmount,
      orderDate: orderDate || new Date(),
      orderUpdateDate: orderUpdateDate || new Date(),
      paymentId: paymentId || "",
      payerId: payerId || "",
    };

    // Attach UPI meta when applicable
    if (paymentMethod === "upi" && paymentMeta) {
      doc.paymentMeta = {
        upiId: String(paymentMeta.upiId).trim(),
        upiName: String(paymentMeta.upiName).trim(),
      };
    }

    const newlyCreatedOrder = new Order(doc);
    await newlyCreatedOrder.save();

    return res.status(201).json({
      success: true,
      message: "Order created successfully",
      orderId: newlyCreatedOrder._id,
      data: newlyCreatedOrder,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      success: false,
      message: "Some error occurred!",
    });
  }
};

module.exports = { createOrder };

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
