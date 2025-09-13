import { Avatar, AvatarFallback } from "../ui/avatar";
import { Button } from "../ui/button";
import { Dialog, DialogContent } from "../ui/dialog";
import { Separator } from "../ui/separator";
import { Input } from "../ui/input";
import { useDispatch, useSelector } from "react-redux";
import { addToCart, fetchCartItems } from "@/store/shop/cart-slice";
import { useToast } from "../ui/use-toast";
import { setProductDetails } from "@/store/shop/products-slice";
import { Label } from "../ui/label";
import StarRatingComponent from "../common/star-rating";
import { useEffect, useMemo, useState } from "react";
import { addReview, getReviews } from "@/store/shop/review-slice";
import { useNavigate } from "react-router-dom";

function ProductDetailsDialog({ open, setOpen, productDetails }) {
  const [reviewMsg, setReviewMsg] = useState("");
  const [rating, setRating] = useState(0);
  const [activeImage, setActiveImage] = useState(productDetails?.image || "");

  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { cartItems } = useSelector((state) => state.shopCart);
  const { reviews } = useSelector((state) => state.shopReview);
  const navigate = useNavigate();
  const { toast } = useToast();

  const galleryImages = useMemo(() => {
    const extra = Array.isArray(productDetails?.images)
      ? productDetails.images.filter(Boolean)
      : [];
    const main = productDetails?.image ? [productDetails.image] : [];
    return [...main, ...extra];
  }, [productDetails]);

  useEffect(() => {
    setActiveImage(productDetails?.image || "");
  }, [productDetails, open]);

  function handleRatingChange(getRating) {
    setRating(getRating);
  }

  function handleAddToCart(getCurrentProductId, getTotalStock) {
    if (!user) {
      toast({ title: `Please login to add items to cart`, variant: "destructive" });
      navigate("/auth/login");
      return;
    }

    let getCartItems = cartItems.items || [];
    if (getCartItems.length) {
      const idx = getCartItems.findIndex((i) => i.productId === getCurrentProductId);
      if (idx > -1) {
        const q = getCartItems[idx].quantity;
        if (q + 1 > getTotalStock) {
          toast({ title: `Only ${q} quantity can be added for this item`, variant: "destructive" });
          return;
        }
      }
    }

    dispatch(addToCart({ userId: user?.id, productId: getCurrentProductId, quantity: 1 }))
      .then((data) => {
        if (data?.payload?.success) {
          dispatch(fetchCartItems(user?.id));
          toast({ title: "Product is added to cart" });
        }
      });
  }

  function handleDialogClose() {
    setOpen(false);
    dispatch(setProductDetails());
    setRating(0);
    setReviewMsg("");
    setActiveImage(productDetails?.image || "");
  }

  function handleAddReview() {
    dispatch(
      addReview({
        productId: productDetails?._id,
        userId: user?.id,
        userName: user?.userName,
        reviewMessage: reviewMsg,
        reviewValue: rating,
      })
    ).then((data) => {
      if (data?.payload?.success) {
        setRating(0);
        setReviewMsg("");
        dispatch(getReviews(productDetails?._id));
        toast({ title: "Review added successfully!" });
      } else {
        toast({ title: "Purchase the product before reviewing", variant: "destructive" });
      }
    });
  }

  useEffect(() => {
    if (productDetails !== null) dispatch(getReviews(productDetails?._id));
  }, [productDetails, dispatch]);

  const averageReview =
    reviews && reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.reviewValue, 0) / reviews.length
      : 0;

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent
        className="
          grid grid-cols-1 lg:grid-cols-2 gap-8 sm:p-12
          w-[95vw] sm:max-w-[90vw] lg:max-w-[70vw]
          h-[90vh] max-h-[90vh] overflow-y-auto overscroll-contain
          lg:h-[85vh] lg:max-h-[85vh] lg:overflow-hidden
        "
      >
        {/* LEFT: Images (centered on desktop) */}
        <div className="relative lg:h-full flex flex-col lg:justify-center">
          <div className="overflow-hidden rounded-lg mb-4">
            <img
              src={activeImage || productDetails?.image}
              alt={productDetails?.title}
              width={600}
              height={600}
              className="aspect-square w-full object-contain"
            />
          </div>

          {galleryImages?.length > 1 && (
            <div
              className="flex gap-3 overflow-x-auto pb-2"
              onMouseLeave={() => setActiveImage(productDetails?.image || "")}
            >
              {galleryImages.map((imgUrl, idx) => {
                const isActive = (activeImage || productDetails?.image) === imgUrl;
                return (
                  <button
                    key={`${imgUrl}-${idx}`}
                    type="button"
                    onMouseEnter={() => setActiveImage(imgUrl)}
                    className={`relative h-16 w-16 flex-shrink-0 rounded-md overflow-hidden border
                      ${isActive ? "border-primary ring-2 ring-primary/30" : "border-transparent"}`}
                    aria-label={`Preview image ${idx + 1}`}
                    title="Hover to preview"
                  >
                    <img src={imgUrl} alt={`thumb-${idx + 1}`} className="h-full w-full object-contain" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT: Scrolls only on desktop; on mobile the whole card scrolls */}
        <div className="lg:min-h-0 lg:overflow-y-auto lg:pr-2">
          <div>
            <h1 className="text-3xl font-extrabold">{productDetails?.title}</h1>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <p
              className={`text-lg font-bold text-muted-foreground ${
                productDetails?.salePrice > 0 ? "line-through" : ""
              }`}
            >
              ₹{productDetails?.price}
            </p>
            {productDetails?.salePrice > 0 ? (
              <p className="text-2xl font-bold text-primary">₹{productDetails?.salePrice}</p>
            ) : null}
          </div>

          <p className="text-muted-foreground text-base mb-5 mt-4">
            {productDetails?.description}
          </p>

          <div className="flex items-center gap-2 mt-2">
            <div className="flex items-center gap-0.5">
              <StarRatingComponent rating={averageReview} />
            </div>
            <span className="text-muted-foreground">({averageReview.toFixed(2)})</span>
          </div>

          <div className="mt-5 mb-5">
            {productDetails?.totalStock === 0 ? (
              <Button className="w-full opacity-60 cursor-not-allowed">Out of Stock</Button>
            ) : (
              <Button
                className="w-full"
                onClick={() => handleAddToCart(productDetails?._id, productDetails?.totalStock)}
              >
                Add to Cart
              </Button>
            )}
          </div>

          <Separator />

          <div className="mt-6">
            <h2 className="text-xl font-bold mb-4">Reviews</h2>
            <div className="grid gap-6">
              {reviews && reviews.length > 0 ? (
                reviews.map((reviewItem) => (
                  <div className="flex gap-4" key={reviewItem?._id}>
                    <Avatar className="w-10 h-10 border">
                      <AvatarFallback>
                        {reviewItem?.userName?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid gap-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold">{reviewItem?.userName}</h3>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <StarRatingComponent rating={reviewItem?.reviewValue} />
                      </div>
                      <p className="text-muted-foreground">{reviewItem.reviewMessage}</p>
                    </div>
                  </div>
                ))
              ) : (
                <h1>No Reviews</h1>
              )}
            </div>

            <div className="mt-10 flex-col flex gap-2">
              <Label>Write a review</Label>
              <div className="flex gap-1">
                <StarRatingComponent rating={rating} handleRatingChange={handleRatingChange} />
              </div>
              <Input
                name="reviewMsg"
                value={reviewMsg}
                onChange={(e) => setReviewMsg(e.target.value)}
                placeholder="Write a review..."
              />
              <Button onClick={handleAddReview} disabled={reviewMsg.trim() === ""}>
                Submit
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ProductDetailsDialog;
