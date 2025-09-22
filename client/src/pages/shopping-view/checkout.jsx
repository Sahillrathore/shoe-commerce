import Address from "@/components/shopping-view/address";
import img from "../../assets/account.jpg";
import { useDispatch, useSelector } from "react-redux";
import UserCartItemsContent from "@/components/shopping-view/cart-items-content";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";
import { createNewOrder } from "@/store/shop/order-slice";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import axios from "axios";
import { Info } from "lucide-react";
import api from "@/lib/api";
// add with other imports
import QRCode from "qrcode";
import { useEffect } from "react"; // already present, just ensure it's imported

function ShoppingCheckout() {
  const { cartItems } = useSelector((state) => state.shopCart);
  const { user } = useSelector((state) => state.auth);

  const [currentSelectedAddress, setCurrentSelectedAddress] = useState(null);

  // payment method state
  const [paymentMethod, setPaymentMethod] = useState("cod"); // 'cod' | 'upi'
  const [upiId, setUpiId] = useState("");
  const [upiName, setUpiName] = useState("");

  // coupons
  const [couponCode, setCouponCode] = useState("");
  const [couponApplying, setCouponApplying] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null); // { code, discount, label }

  // confirm modal
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [placing, setPlacing] = useState(false);

  const [upiQRDataUrl, setUpiQRDataUrl] = useState("");
  const [upiUTR, setUpiUTR] = useState(""); // user’s payment reference after paying
  // ---- CONFIG: set your merchant VPA & name here or pull from your config API ----
  const MERCHANT_UPI = "sahilrathore1@indianbank";
  const MERCHANT_NAME = "Sahil";

  const dispatch = useDispatch();
  const { toast } = useToast();

  const items = cartItems?.items || [];

  console.log(cartItems);


  const subtotal = useMemo(
    () =>
      items.length > 0
        ? items.reduce(
          (sum, it) =>
            sum +
            (it?.salePrice > 0 ? it?.salePrice : it?.price) * (it?.quantity || 0),
          0
        )
        : 0,
    [items]
  );

  // ---- ONE-OFFER-ONLY RULES (frontend) ----
  const couponDiscount = appliedCoupon?.discount || 0;
  const upiEligible = paymentMethod === "upi" && !appliedCoupon; // UPI only if no coupon applied
  const upiDiscount = upiEligible ? 100 : 0;
  const offerDiscount = couponDiscount > 0 ? couponDiscount : upiDiscount;
  const finalAmount = Math.max(0, subtotal - offerDiscount);

  const isCartEmpty = items.length === 0;

  // Build UPI intent URI
  function buildUpiUri({ pa, pn, am, tn, tr }) {
    // pa: payee address (VPA), pn: payee name, am: amount, tn: note, tr: transaction ref (optional)
    const params = new URLSearchParams({
      pa: String(pa),
      pn: String(pn),
      am: String(Number(am || 0).toFixed(2)),
      tn: String(tn || "Order Payment"),
      cu: "INR",
    });
    if (tr) params.set("tr", String(tr));
    return `upi://pay?${params.toString()}`;
  }

  // Basic UPI validation: abc@upiapp
  const isValidUpiId = (v) =>
    /^[\w.\-]{2,}@[A-Za-z]{2,}$/.test(String(v || "").trim());
  const canProceed =
    paymentMethod === "cod" ||
    (paymentMethod === "upi" &&
      isValidUpiId(upiId) &&
      String(upiName).trim().length >= 2);

  function guardChecks() {
    if (isCartEmpty) {
      toast({
        title: "Your cart is empty. Please add items to proceed",
        variant: "destructive",
      });
      return false;
    }
    if (!currentSelectedAddress) {
      toast({
        title: "Please select one address to proceed.",
        variant: "destructive",
      });
      return false;
    }
    if (paymentMethod === "upi" && !canProceed) {
      toast({
        title: "Invalid UPI details",
        description: "Enter a valid UPI ID (e.g., name@upi) and your name as on UPI.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  }

  async function handleApplyCoupon() {
    const code = String(couponCode || "").trim();
    if (!code) {
      toast({ title: "Enter a coupon code", variant: "destructive" });
      return;
    }
    setCouponApplying(true);
    try {
      const res = await api.post("/coupons/validate", {
        code,
        subtotal,
        userId: user?.id,
      });
      if (res?.data?.success && res?.data?.valid) {
        setAppliedCoupon({
          code: res.data.code,
          discount: res.data.discount,
          label: res.data.label,
        });
        toast({
          title: "Coupon applied",
          description:
            paymentMethod === "upi"
              ? "UPI ₹100 discount won’t apply while a coupon is active."
              : res.data.label || code,
        });
      } else {
        setAppliedCoupon(null);
        toast({
          title: "Coupon invalid",
          description: res?.data?.message || "Please try another code.",
          variant: "destructive",
        });
      }
    } catch (e) {
      toast({
        title: "Error applying coupon",
        description: e?.response?.data?.message || e?.message || "Try again later.",
        variant: "destructive",
      });
    } finally {
      setCouponApplying(false);
    }
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null);
    setCouponCode("");
    toast({ title: "Coupon removed" });
  }

  function handleCheckoutClick() {
    if (!guardChecks()) return;
    setConfirmOpen(true);
  }

  function buildOrderData() {
    return {
      userId: user?.id,
      cartId: cartItems?._id,
      cartItems: items.map((it) => ({
        productId: it?.productId,
        title: it?.title,
        image: it?.image,
        price: it?.salePrice > 0 ? it?.salePrice : it?.price,
        quantity: it?.quantity,
        size: it?.size ?? null,
      })),
      addressInfo: {
        addressId: currentSelectedAddress?._id,
        address: currentSelectedAddress?.address,
        city: currentSelectedAddress?.city,
        pincode: currentSelectedAddress?.pincode,
        phone: currentSelectedAddress?.phone,
        notes: currentSelectedAddress?.notes,
      },

      // payment / status
      orderStatus: "pending",
      paymentMethod,
      paymentStatus: "pending",

      // pricing (mirror the one-offer-only rule)
      pricing: {
        subtotal,
        coupon: appliedCoupon
          ? { code: appliedCoupon.code, discount: appliedCoupon.discount }
          : null,
        upiDiscount, // will be 0 if coupon applied
        finalAmount,
      },

      totalAmount: finalAmount,

      orderDate: new Date(),
      orderUpdateDate: new Date(),

      // UPI meta (if any)
      paymentMeta:
        paymentMethod === "upi"
          ? {
            upiId: String(upiId).trim(),
            upiName: String(upiName).trim(),
            // utr: String(upiUTR).trim(),              // <-- add this
            merchantVpa: MERCHANT_UPI,
            amount: finalAmount,
          }
          : undefined,
    };
  }

  function handleConfirmPlaceOrder() {
    const orderData = buildOrderData();
    setPlacing(true);
    dispatch(createNewOrder(orderData))
      .then((res) => {
        if (res?.payload?.success) {
          toast({ title: "Order placed successfully!" });
          setConfirmOpen(false);
          setUpiId("");
          setUpiName("");
          setAppliedCoupon(null);
          setCouponCode("");
        } else {
          toast({
            title: "Failed to place order",
            description: res?.payload?.message || "Please try again.",
            variant: "destructive",
          });
        }
      })
      .catch((err) => {
        toast({
          title: "Error",
          description: err?.message || "Something went wrong.",
          variant: "destructive",
        });
      })
      .finally(() => setPlacing(false));
  }

  useEffect(() => {
    if (paymentMethod !== "upi") {
      setUpiQRDataUrl("");
      return;
    }
    // Optional: include a lightweight client-side ref/txn id for the QR (helps reconciliation)
    const localRef = `ORD-${Date.now()}`;

    const uri = buildUpiUri({
      pa: MERCHANT_UPI,
      pn: MERCHANT_NAME,
      am: finalAmount,              // your computed payable
      tn: `Order payment ₹${finalAmount}`,
      tr: localRef,
    });

    QRCode.toDataURL(uri, { margin: 1, scale: 6 })
      .then(setUpiQRDataUrl)
      .catch(() => setUpiQRDataUrl("")); // fail silent
  }, [paymentMethod, finalAmount]);


  return (
    <div className="flex flex-col">
      <div className="relative h-[300px] w-full overflow-hidden">
        <img src={img} className="h-full w-full object-cover object-center" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5 p-5">
        {/* Address selector */}
        <Address
          selectedId={currentSelectedAddress}
          setCurrentSelectedAddress={setCurrentSelectedAddress}
        />

        {/* Cart + Payment */}
        <div className="flex flex-col gap-4">
          {items.length > 0
            ? items.map((item) => (
              <UserCartItemsContent
                key={`${item.productId}-${item.size ?? 'nosize'}`}
                cartItem={item}
              />
            ))
            : null}

          <p className="text-xs text-gray-600">Expected Delivery 4-6 days</p>

          {/* Offers / Coupons */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold">Offers for you</p>
                <p className="text-sm text-muted-foreground">
                  Pay via <span className="font-medium">UPI</span> and get{" "}
                  <span className="font-medium">₹100 OFF</span> instantly.
                </p>
              </div>
              {upiEligible && (
                <div className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">
                  ₹100 applied
                </div>
              )}
            </div>

            {/* One-offer-only rule note */}
            <div className="flex items-start gap-2 text-xs text-muted-foreground mt-2">
              <Info className="h-4 w-4 mt-0.5" />
              <p>
                Only one offer applies per order — either a <b>coupon</b> or the{" "}
                <b>UPI ₹100</b> discount.
              </p>
            </div>
            {paymentMethod === "upi" && appliedCoupon && (
              <p className="text-xs text-amber-600 mt-1">
                Coupon <b>{appliedCoupon.code}</b> is applied, so the UPI ₹100 discount
                won’t apply.{" "}
                <button
                  type="button"
                  className="underline"
                  onClick={handleRemoveCoupon}
                >
                  Remove coupon
                </button>
                .
              </p>
            )}

            <div className="grid sm:grid-cols-[1fr_auto_auto] grid-cols-1 gap-2">
              <Input
                placeholder="Enter coupon code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                disabled={!!appliedCoupon}
              />
              {!appliedCoupon ? (
                <Button
                  onClick={handleApplyCoupon}
                  disabled={couponApplying || !couponCode.trim()}
                  className="sm:w-28 w-full"
                >
                  {couponApplying ? "Applying..." : "Apply"}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={handleRemoveCoupon}
                  className="sm:w-28 w-full"
                >
                  Remove
                </Button>
              )}
            </div>

            {appliedCoupon ? (
              <p className="text-sm text-green-700">
                Applied <strong>{appliedCoupon.code}</strong> — Saved ₹
                {appliedCoupon.discount}
                {appliedCoupon.label ? ` (${appliedCoupon.label})` : ""}
              </p>
            ) : null}
          </div>

          {/* Pricing (show only the active offer) */}
          <div className="mt-4 space-y-2 border rounded-lg p-4">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>₹{subtotal}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span>Delivery</span>
              <span className="font-medium">FREE</span>
            </div>

            {appliedCoupon ? (
              <div className="flex justify-between text-sm">
                <span>Coupon ({appliedCoupon.code})</span>
                <span className="text-green-600">-₹{couponDiscount}</span>
              </div>
            ) : upiEligible ? (
              <div className="flex justify-between text-sm">
                <span>UPI Discount</span>
                <span className="text-green-600">-₹{upiDiscount}</span>
              </div>
            ) : null}

            <div className="flex justify-between font-bold pt-2 border-t">
              <span>Payable</span>
              <span>₹{finalAmount}</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="mt-2 border rounded-lg p-4 space-y-3">
            <p className="font-semibold">Payment Method</p>

            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cod"
                  checked={paymentMethod === "cod"}
                  onChange={() => setPaymentMethod("cod")}
                />
                <span>Cash on Delivery (COD)</span>
              </label>

              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="upi"
                  checked={paymentMethod === "upi"}
                  onChange={() => setPaymentMethod("upi")}
                />
                <span>UPI</span>
              </label>
            </div>

            {paymentMethod === "upi" && (
              <div className="grid gap-3 mt-2">
                {/* QR + merchant info */}
                <div className="rounded-lg border p-3">
                  <p className="font-medium">Scan & Pay via UPI</p>
                  <p className="text-xs text-muted-foreground">
                    Payable: <span className="font-semibold">₹{finalAmount}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Receiver: <span className="font-semibold">{MERCHANT_NAME}</span> (
                    {MERCHANT_UPI})
                  </p>

                  <div className="mt-3 flex sm:flex-row flex-col items-center gap-4">
                    <div className="p-2 border rounded-md">
                      {upiQRDataUrl ? (
                        <img
                          src={upiQRDataUrl}
                          alt="UPI QR"
                          className="h-[200px] w-[200px]"
                        />
                      ) : (
                        <div className="h-[200px] w-[200px] grid place-items-center text-xs text-muted-foreground">
                          Generating QR…
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      {/* On mobile this opens UPI app; safe to show for desktop too */}
                      <a
                        href={buildUpiUri({
                          pa: MERCHANT_UPI,
                          pn: MERCHANT_NAME,
                          am: finalAmount,
                          tn: `Order payment ₹${finalAmount}`,
                        })}
                        className="text-sm underline"
                      >
                        Open in UPI app
                      </a>
                      <p className="text-xs text-muted-foreground max-w-[220px]">
                        After paying, enter the UPI details below so we can verify
                        your payment faster.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Payer’s UPI details */}
                <div>
                  <label className="text-sm block mb-1">UPI ID</label>
                  <Input
                    placeholder="yourname@upi"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                  />
                  {!isValidUpiId(upiId) && upiId?.length > 0 && (
                    <p className="text-xs text-red-500 mt-1">
                      Enter a valid UPI ID (e.g., name@upi)
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm block mb-1">Name (as on UPI)</label>
                  <Input
                    placeholder="Full name as on UPI"
                    value={upiName}
                    onChange={(e) => setUpiName(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Reinforce rule near payment method */}
            <p className="text-xs text-muted-foreground">
              Only one offer can be applied.{" "}
              {appliedCoupon
                ? "UPI ₹100 off won’t apply while a coupon is active."
                : paymentMethod === "upi"
                  ? "Applying a coupon will replace the UPI discount."
                  : ""}
            </p>
          </div>

          {/* Checkout button */}
          <div className="mt-2 w-full">
            <Button
              onClick={handleCheckoutClick}
              className="w-full"
              disabled={placing}
            >
              {placing
                ? "Placing order..."
                : paymentMethod === "cod"
                  ? "Checkout (COD)"
                  : "Checkout (UPI)"}
            </Button>
          </div>
        </div>
      </div>

      {/* Confirm Modal */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Confirm your order</h3>

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Deliver to</p>
              <div className="rounded-md border p-3">
                <p className="font-medium">
                  {currentSelectedAddress?.address}, {currentSelectedAddress?.city} -{" "}
                  {currentSelectedAddress?.pincode}
                </p>
                <p className="text-sm text-muted-foreground">
                  Phone: {currentSelectedAddress?.phone}
                </p>
                {currentSelectedAddress?.notes ? (
                  <p className="text-sm text-muted-foreground">
                    Notes: {currentSelectedAddress?.notes}
                  </p>
                ) : null}
              </div>
            </div>

            {/* Items summary with sizes */}
            <div className="rounded-md border p-3">
              <p className="text-sm font-medium mb-2">Items</p>
              <ul className="space-y-1 text-sm">
                {items.map((it) => (
                  <li
                    key={`${it.productId}-${it.size ?? 'nosize'}-review`}
                    className="flex justify-between gap-2"
                  >
                    <span className="truncate">
                      {it.title}
                      {it.size ? (
                        <span className="text-muted-foreground"> — Size: {it.size}</span>
                      ) : null}{" "}
                      × {it.quantity}
                    </span>
                    <span>
                      ₹{(it.salePrice > 0 ? it.salePrice : it.price) * it.quantity}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{subtotal}</span>
              </div>

              {appliedCoupon ? (
                <div className="flex justify-between">
                  <span>Coupon ({appliedCoupon.code})</span>
                  <span>-₹{couponDiscount}</span>
                </div>
              ) : upiEligible ? (
                <div className="flex justify-between">
                  <span>UPI Discount</span>
                  <span>-₹{upiDiscount}</span>
                </div>
              ) : null}

              <div className="flex justify-between font-semibold border-t pt-2">
                <span>Payable</span>
                <span>₹{finalAmount}</span>
              </div>
            </div>

            {paymentMethod === "upi" && (
              <div className="rounded-md border p-3">
                <p className="text-sm"><span className="font-semibold">UPI ID:</span> {upiId || "-"}</p>
                <p className="text-sm"><span className="font-semibold">Name:</span> {upiName || "-"}</p>
                {/* <p className="text-sm"><span className="font-semibold">UTR:</span> {upiUTR || "-"}</p> */}
              </div>
            )}

            <div className="flex gap-3 justify-end pt-2">
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirmPlaceOrder}
                disabled={placing || !canProceed}
              >
                Place Order
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ShoppingCheckout;
