const router = require("express").Router();
const { validateCoupon, availableCoupons } = require("../../controllers/common/couponController");

router.post("/validate", validateCoupon);
router.get("/available", availableCoupons);

module.exports = router;
