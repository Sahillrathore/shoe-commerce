const Coupon = require("../../models/Coupon");
const Order = require("../../models/Order"); // for per-user usage checks

function computeDiscount(coupon, subtotal) {
  if (coupon.type === "flat") return Math.min(subtotal, Math.max(0, coupon.value));
  // percent
  const raw = (subtotal * coupon.value) / 100;
  return Math.min(
    subtotal,
    Math.max(0, coupon.maxDiscount ? Math.min(raw, coupon.maxDiscount) : raw)
  );
}

exports.validateCoupon = async (req, res) => {
  try {
    const { code, subtotal, userId } = req.body;
    if (!code || typeof subtotal !== "number")
      return res.status(400).json({ success: false, message: "code and subtotal are required" });

    const coupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (!coupon || !coupon.active)
      return res.json({ success: false, valid: false, message: "Invalid coupon" });

    const now = new Date();
    if (coupon.startAt && now < coupon.startAt)
      return res.json({ success: false, valid: false, message: "Coupon not started yet" });
    if (coupon.endAt && now > coupon.endAt)
      return res.json({ success: false, valid: false, message: "Coupon expired" });
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit)
      return res.json({ success: false, valid: false, message: "Coupon usage limit reached" });
    if (subtotal < coupon.minOrder)
      return res.json({
        success: false,
        valid: false,
        message: `Minimum order amount is ₹${coupon.minOrder}`,
      });

    // basic per-user limit check via orders
    if (userId && coupon.perUserLimit > 0) {
      const userUsage = await Order.countDocuments({
        userId,
        "pricing.coupon.code": coupon.code,
      });
      if (userUsage >= coupon.perUserLimit) {
        return res.json({
          success: false,
          valid: false,
          message: "You have already used this coupon",
        });
      }
    }

    const discount = Math.floor(computeDiscount(coupon, subtotal));
    return res.json({
      success: true,
      valid: true,
      code: coupon.code,
      discount,
      label:
        coupon.type === "percent"
          ? `${coupon.value}% off (max ₹${coupon.maxDiscount || "—"})`
          : `Flat ₹${coupon.value} off`,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, valid: false, message: "Server error" });
  }
};

// (Optional) list available coupons for a subtotal
exports.availableCoupons = async (req, res) => {
  try {
    const subtotal = Number(req.query.subtotal || 0);
    const now = new Date();
    const coupons = await Coupon.find({
      active: true,
      startAt: { $lte: now },
      $or: [{ endAt: null }, { endAt: { $gte: now } }],
      minOrder: { $lte: subtotal },
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    res.json({ success: true, data: coupons });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
