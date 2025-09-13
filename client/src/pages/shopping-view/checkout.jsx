import Address from "@/components/shopping-view/address";
import img from "../../assets/account.jpg";
import { useDispatch, useSelector } from "react-redux";
import UserCartItemsContent from "@/components/shopping-view/cart-items-content";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { createNewOrder } from "@/store/shop/order-slice";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";

function ShoppingCheckout() {
  const { cartItems } = useSelector((state) => state.shopCart);
  const { user } = useSelector((state) => state.auth);

  const [currentSelectedAddress, setCurrentSelectedAddress] = useState(null);

  // payment method state
  const [paymentMethod, setPaymentMethod] = useState("cod"); // 'cod' | 'upi'
  const [upiId, setUpiId] = useState("");
  const [upiName, setUpiName] = useState("");

  // confirm modal
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [placing, setPlacing] = useState(false);

  const dispatch = useDispatch();
  const { toast } = useToast();

  const items = cartItems?.items || [];

  const totalCartAmount = useMemo(
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

  const isCartEmpty = items.length === 0;

  // Basic UPI validation: abc@upiapp
  const isValidUpiId = (v) => /^[\w.\-]{2,}@[A-Za-z]{2,}$/.test(String(v || "").trim());
  const canProceed =
    paymentMethod === "cod" ||
    (paymentMethod === "upi" && isValidUpiId(upiId) && String(upiName).trim().length >= 2);

  function guardChecks() {
    if (isCartEmpty) {
      toast({ title: "Your cart is empty. Please add items to proceed", variant: "destructive" });
      return false;
    }
    if (!currentSelectedAddress) {
      toast({ title: "Please select one address to proceed.", variant: "destructive" });
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
      })),
      addressInfo: {
        addressId: currentSelectedAddress?._id,
        address: currentSelectedAddress?.address,
        city: currentSelectedAddress?.city,
        pincode: currentSelectedAddress?.pincode,
        phone: currentSelectedAddress?.phone,
        notes: currentSelectedAddress?.notes,
      },
      orderStatus: "pending",      // placed/confirmed at this step
      paymentMethod,                 // 'cod' | 'upi'
      paymentStatus: "pending",      // until settled/verified
      totalAmount: totalCartAmount,
      orderDate: new Date(),
      orderUpdateDate: new Date(),

      // Carry UPI info when used (backend can store in a metadata field)
      paymentMeta:
        paymentMethod === "upi"
          ? { upiId: String(upiId).trim(), upiName: String(upiName).trim() }
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
          // You can navigate to an order success page if you want
          // navigate("/orders/success");
          setUpiId("");
          setUpiName("");
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
            ? items.map((item) => <UserCartItemsContent key={item.productId} cartItem={item} />)
            : null}

          <div className="mt-8 space-y-4">
            <div className="flex justify-between">
              <span className="font-bold">Total</span>
              <span className="font-bold">₹{totalCartAmount}</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="mt-4 border rounded-lg p-4 space-y-3">
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

            {/* UPI Details */}
            {paymentMethod === "upi" && (
              <div className="grid gap-3 mt-2">
                <div>
                  <label className="text-sm block mb-1">UPI ID</label>
                  <Input
                    placeholder="yourname@upi"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                  />
                  {!isValidUpiId(upiId) && upiId?.length > 0 && (
                    <p className="text-xs text-red-500 mt-1">Enter a valid UPI ID (e.g., name@upi)</p>
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
          </div>

          {/* Checkout button */}
          <div className="mt-4 w-full">
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

            <div className="flex justify-between">
              <span className="font-semibold">Order Total</span>
              <span className="font-semibold">₹{totalCartAmount}</span>
            </div>

            {paymentMethod === "upi" && (
              <div className="rounded-md border p-3">
                <p className="text-sm">
                  <span className="font-semibold">UPI ID:</span> {upiId || "-"}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Name:</span> {upiName || "-"}
                </p>
              </div>
            )}

            <div className="flex gap-3 justify-end pt-2">
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleConfirmPlaceOrder} disabled={placing || !canProceed}>
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
