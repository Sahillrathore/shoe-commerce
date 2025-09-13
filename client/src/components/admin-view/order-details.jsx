import { useMemo, useState } from "react";
import CommonForm from "../common/form";
import { DialogContent } from "../ui/dialog";
import { Label } from "../ui/label";
import { Separator } from "../ui/separator";
import { Badge } from "../ui/badge";
import { useDispatch, useSelector } from "react-redux";
import {
  getAllOrdersForAdmin,
  getOrderDetailsForAdmin,
  updateOrderStatus,
} from "@/store/admin/order-slice";
import { useToast } from "../ui/use-toast";

const initialFormData = {
  status: "",
};

function AdminOrderDetailsView({ orderDetails }) {
  const [formData, setFormData] = useState(initialFormData);
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const { toast } = useToast();

  // Helpers
  const inr = (n) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(n || 0));

  // Fallbacks for older orders without `pricing`
  const cartItems = orderDetails?.cartItems || [];
  const computedSubtotal = useMemo(
    () =>
      cartItems.reduce(
        (sum, it) => sum + Number(it?.price || 0) * Number(it?.quantity || 0),
        0
      ),
    [cartItems]
  );

  const pricing = orderDetails?.pricing || {};
  const subtotal = pricing?.subtotal ?? computedSubtotal;
  const couponCode = pricing?.coupon?.code || null;
  const couponDiscount = Number(pricing?.coupon?.discount || 0);
  const upiDiscount = Number(pricing?.upiDiscount || 0);
  // keep 0 as a valid amount; avoid mixing ?? with ||
  const computedFinal =
    Math.max(0, Number(subtotal ?? 0) - Number(couponDiscount ?? 0) - Number(upiDiscount ?? 0));

  const finalAmount =
    pricing?.finalAmount ?? orderDetails?.totalAmount ?? computedFinal;


  // Optional: show UPI meta if available
  const upiId = orderDetails?.paymentMeta?.upiId;
  const upiName = orderDetails?.paymentMeta?.upiName;

  function handleUpdateStatus(event) {
    event.preventDefault();
    const { status } = formData;

    dispatch(
      updateOrderStatus({ id: orderDetails?._id, orderStatus: status })
    ).then((data) => {
      if (data?.payload?.success) {
        dispatch(getOrderDetailsForAdmin(orderDetails?._id));
        dispatch(getAllOrdersForAdmin());
        setFormData(initialFormData);
        toast({ title: data?.payload?.message });
      }
    });
  }

  // Order date/time (optional: show time too)
  const orderDateTime = useMemo(() => {
    if (!orderDetails?.orderDate) return "-";
    try {
      return new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
        hour12: true,
        timeZone: "Asia/Kolkata",
      }).format(new Date(orderDetails.orderDate));
    } catch {
      return orderDetails?.orderDate?.split("T")?.[0] || "-";
    }
  }, [orderDetails?.orderDate]);

  return (
    <DialogContent className="sm:max-w-[720px] overflow-y-scroll">
      <div className="grid gap-6">
        {/* Header info */}
        <div className="grid gap-2">
          <div className="flex mt-6 items-center justify-between">
            <p className="font-medium">Order ID</p>
            <Label className="font-mono text-xs sm:text-sm">
              {orderDetails?._id}
            </Label>
          </div>

          <div className="flex mt-2 items-center justify-between">
            <p className="font-medium">Order Date & Time</p>
            <Label>{orderDateTime}</Label>
          </div>

          <div className="flex mt-2 items-center justify-between">
            <p className="font-medium">Payment Method</p>
            <Label className="capitalize">{orderDetails?.paymentMethod}</Label>
          </div>

          <div className="flex mt-2 items-center justify-between">
            <p className="font-medium">Payment Status</p>
            <Label className="capitalize">{orderDetails?.paymentStatus}</Label>
          </div>

          <div className="flex mt-2 items-center justify-between">
            <p className="font-medium">Order Status</p>
            <Label>
              <Badge
                className={`py-1 px-3 ${orderDetails?.orderStatus === "confirmed"
                    ? "bg-green-500"
                    : orderDetails?.orderStatus === "rejected"
                      ? "bg-red-600"
                      : "bg-black"
                  }`}
              >
                {orderDetails?.orderStatus}
              </Badge>
            </Label>
          </div>
        </div>

        <Separator />

        {/* Line Items */}
        <div className="grid gap-4">
          <div className="grid gap-2">
            <div className="font-medium">Order Details</div>
            <ul className="grid gap-3">
              {cartItems.length > 0
                ? cartItems.map((item) => {
                  const lineTotal =
                    Number(item?.price || 0) * Number(item?.quantity || 0);
                  return (
                    <li
                      key={`${item.productId}-${item.title}`}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="truncate pr-2">
                        <span className="text-muted-foreground">Title:</span>{" "}
                        {item.title}
                      </span>
                      <span>
                        <span className="text-muted-foreground">
                          Price:
                        </span>{" "}
                        {inr(item.price)}
                      </span>
                      <span>
                        <span className="text-muted-foreground">
                          Qty:
                        </span>{" "}
                        {item.quantity}
                      </span>
                      <span className="font-medium">{inr(lineTotal)}</span>
                    </li>
                  );
                })
                : null}
            </ul>
          </div>
        </div>

        {/* Price Summary */}
        <div className="grid gap-3">
          <div className="font-medium">Price Summary</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{inr(subtotal)}</span>
            </div>

            {couponCode ? (
              <div className="flex justify-between">
                <span>
                  Coupon{" "}
                  <Badge variant="outline" className="ml-1">
                    {couponCode}
                  </Badge>
                </span>
                <span className="text-green-600">- {inr(couponDiscount)}</span>
              </div>
            ) : null}

            {upiDiscount > 0 ? (
              <div className="flex justify-between">
                <span>UPI Discount</span>
                <span className="text-green-600">- {inr(upiDiscount)}</span>
              </div>
            ) : null}

            <div className="flex justify-between font-semibold border-t pt-2">
              <span>Total Payable</span>
              <span>{inr(finalAmount)}</span>
            </div>
          </div>

          {/* Optional: show UPI meta for admins */}
          {orderDetails?.paymentMethod === "upi" && (upiId || upiName) ? (
            <div className="text-xs text-muted-foreground">
              <div>
                <span className="font-medium">UPI ID:</span> {upiId || "-"}
              </div>
              <div>
                <span className="font-medium">UPI Name:</span> {upiName || "-"}
              </div>
            </div>
          ) : null}
        </div>

        <Separator />

        {/* Shipping Info */}
        <div className="grid gap-4">
          <div className="grid gap-2">
            <div className="font-medium">Shipping Info</div>
            <div className="grid gap-0.5 text-muted-foreground">
              {/* <span>{user.userName}</span> */}
              <span>{orderDetails?.addressInfo?.address}</span>
              <span>{orderDetails?.addressInfo?.city}</span>
              <span>{orderDetails?.addressInfo?.pincode}</span>
              <span>{orderDetails?.addressInfo?.phone}</span>
              <span>{orderDetails?.addressInfo?.notes}</span>
            </div>
          </div>
        </div>

        {/* Update Status */}
        <div>
          <CommonForm
            formControls={[
              {
                label: "Order Status",
                name: "status",
                componentType: "select",
                options: [
                  { id: "pending", label: "Pending" },
                  { id: "inProcess", label: "In Process" },
                  { id: "inShipping", label: "In Shipping" },
                  { id: "delivered", label: "Delivered" },
                  { id: "rejected", label: "Rejected" },
                ],
              },
            ]}
            formData={formData}
            setFormData={setFormData}
            buttonText={"Update Order Status"}
            onSubmit={handleUpdateStatus}
          />
        </div>
      </div>
    </DialogContent>
  );
}

export default AdminOrderDetailsView;
