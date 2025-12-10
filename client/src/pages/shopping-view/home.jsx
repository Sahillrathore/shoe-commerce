import { Button } from "@/components/ui/button";
import bannerOne from "../../assets/banner-1.webp";
import bannerTwo from "../../assets/banner-2.webp";
import bannerThree from "../../assets/banner-3.webp";
import {
  Airplay,
  BabyIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloudLightning,
  Heater,
  Images,
  Shirt,
  ShirtIcon,
  ShoppingBasket,
  UmbrellaIcon,
  WashingMachine,
  WatchIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchAllFilteredProducts,
  fetchProductDetails,
} from "@/store/shop/products-slice";
import ShoppingProductTile from "@/components/shopping-view/product-tile";
import { Link, useNavigate } from "react-router-dom";
import { addToCart, fetchCartItems } from "@/store/shop/cart-slice";
import { useToast } from "@/components/ui/use-toast";
import ProductDetailsDialog from "@/components/shopping-view/product-details";
import { getFeatureImages } from "@/store/common-slice";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";

const categoriesWithIcon = [
  { id: "men", label: "Men", icon: '/mensCat.png' },
  { id: "women", label: "Women", icon: '/womenCat.jpg' },
  // { id: "kids", label: "Kids", icon: BabyIcon },
  { id: "accessories", label: "Accessories", icon: '/watch.png' },
  { id: "footwear", label: "Footwear", icon: '/chicagoshoe.png' },
];

const brandsWithIcon = [
  { id: "nike", label: "Nike", icon: Shirt },
  { id: "adidas", label: "Adidas", icon: WashingMachine },
  { id: "puma", label: "Puma", icon: ShoppingBasket },
  { id: "levi", label: "Levi's", icon: Airplay },
  { id: "zara", label: "Zara", icon: Images },
  { id: "h&m", label: "H&M", icon: Heater },
];
function ShoppingHome() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const { productList, productDetails, isLoading } = useSelector(
    (state) => state.shopProducts
  );
  const { featureImageList } = useSelector((state) => state.commonFeature);

  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);

  const { user } = useSelector((state) => state.auth);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { toast } = useToast();

  function handleNavigateToListingPage(getCurrentItem, section) {
    sessionStorage.removeItem("filters");
    const currentFilter = {
      [section]: [getCurrentItem.id],
    };

    sessionStorage.setItem("filters", JSON.stringify(currentFilter));
    navigate(`/shop/listing`);
  }

  function handleGetProductDetails(getCurrentProductId) {
    dispatch(fetchProductDetails(getCurrentProductId));
  }

  function handleAddtoCart(getCurrentProductId) {
    dispatch(
      addToCart({
        userId: user?.id,
        productId: getCurrentProductId,
        quantity: 1,
      })
    ).then((data) => {
      if (data?.payload?.success) {
        dispatch(fetchCartItems(user?.id));
        toast({
          title: "Product is added to cart",
        });
      }
    });
  }

  useEffect(() => {
    if (productDetails !== null) setOpenDetailsDialog(true);
  }, [productDetails]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prevSlide) => (prevSlide + 1) % featureImageList.length);
    }, 15000);

    return () => clearInterval(timer);
  }, [featureImageList]);

  useEffect(() => {
    dispatch(
      fetchAllFilteredProducts({
        filterParams: {},
        sortParams: "price-lowtohigh",
      })
    );
  }, [dispatch]);

  console.log(productList, "productList");

  useEffect(() => {
    dispatch(getFeatureImages());
  }, [dispatch]);

  return (
    <div className="flex flex-col min-h-screen">
      <div className="relative w-full min-h-[600px] overflow-hidden grid  md:grid-cols-3 grid-cols-1 gap-0.5">


        <Link to="/shop/listing?category=footwear">
          <img src="/image.png" className="object-contain" />
        </Link>

        <Link to="/shop/listing?category=footwear">
          <img src="/nikebanner3.jpeg" className="object-contain" />
        </Link>

        <Link to="/shop/listing?category=footwear">
          <img src="/download.jpeg" className="object-cover" />
        </Link>

      </div>

      <div>
        <section className="py-10">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-normal capitalize text-center mb-8">
              Browse Popular <span className="sm:inline hidden">range</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 sm:gap-6 gap-2">
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                  <ProductCardSkeleton key={`pop-skel-${i}`} />
                ))
                : productList && productList.length > 0
                  ? productList
                    .filter((p) => p?.subCategory === "popular")
                    .slice(0, 9)
                    .map((productItem) => (
                      <ShoppingProductTile
                        key={productItem?._id || productItem?.id}
                        handleGetProductDetails={handleGetProductDetails}
                        product={productItem}
                        handleAddtoCart={handleAddtoCart}
                      />
                    ))
                  : null}
            </div>

            <Link to='/shop/listing' className="text-base block w-fit mt-5 mx-auto font-semibold px-8 py-3 border border-zinc-300 hover:border-zinc-500 transition-all duration-300 rounded-lg">View All</Link>
          </div>
        </section>
        <section className="py-10">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-normal capitalize text-center mb-8">
              Featured range
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 sm:gap-4 gap-2">
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                  <ProductCardSkeleton key={`feat-skel-${i}`} />
                ))
                : productList && productList.length > 0
                  ? productList
                    .filter((p) => p?.subCategory === "featured")
                    .map((productItem) => (
                      <ShoppingProductTile
                        key={productItem?._id || productItem?.id}
                        handleGetProductDetails={handleGetProductDetails}
                        product={productItem}
                        handleAddtoCart={handleAddtoCart}
                      />
                    ))
                  : null}
            </div>

          </div>
        </section>
      </div>

      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-normal capitalize text-center mb-8">
            Shop by category
          </h2>

          {/* Flex wrapper to center the grid */}
          <div className="flex justify-center">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 sm:gap-6 gap-2">
              {categoriesWithIcon.map((categoryItem) => (
                <Card
                  key={categoryItem.label}
                  onClick={() =>
                    handleNavigateToListingPage(categoryItem, "category")
                  }
                  className="cursor-pointer hover:shadow-lg transition-shadow pb-2 overflow-hidden"
                >
                  <CardContent className="flex flex-col items-center justify-center p-0 overflow-hidden">
                    <img
                      src={categoryItem.icon}
                      alt={categoryItem.label}
                      className="w-44 sm:h-44 h-40 mb-4"
                    />
                    <span className="font-bold">{categoryItem.label}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>


      <ProductDetailsDialog
        open={openDetailsDialog}
        setOpen={setOpenDetailsDialog}
        productDetails={productDetails}
      />
    </div>
  );
}

export default ShoppingHome;
