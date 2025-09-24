import { Card, CardContent, CardFooter } from "../ui/card";
import { Button } from "../ui/button";
import { brandOptionsMap, categoryOptionsMap } from "@/config";
import { Badge } from "../ui/badge";
import { toast } from "../ui/use-toast";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";


const ShoppingProductTile = ({
  product,
  handleGetProductDetails,
  handleAddtoCart,
}) => {

  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  
  const addToCart = (pid, pstck) => {
    if (!user) {
      toast({
        title: `Please login to add items to cart`,
        variant: "destructive",
      });
      navigate("/auth/login");
      return;
    }

    handleAddtoCart(pid, pstck);
  
  }

  return (
    <Card className="w-full max-w-sm mx-auto">
      <div onClick={() => handleGetProductDetails(product?._id)}>
        <div className="relative cursor-pointer">
          <img
            src={product?.image}
            alt={product?.title}
            className="w-full sm:h-[300px] h-[200px] object-contain rounded-t-lg"
          />
          {product?.totalStock === 0 ? (
            <Badge className="absolute top-2 left-2 bg-red-500 hover:bg-red-600">
              Out Of Stock
            </Badge>
          ) : product?.totalStock < 10 ? (
            <Badge className="absolute top-2 left-2 bg-red-500 hover:bg-red-600">
              {`Only ${product?.totalStock} items left`}
            </Badge>
          ) : product?.salePrice > 0 ? (
            <Badge className="absolute text-[10px] top-2 left-2 uppercase bg-red-500 hover:bg-red-600">
              {product?.subCategory}
            </Badge>
          ) : null}
        </div>
        <CardContent className="sm:p-4 p-2">
          <h2 className="sm:text-xl text-sm font-bold mb-2">{product?.title}</h2>
          <div className="flex justify-between items-center mb-2">
            <span className="sm:text-[16px] text-xs text-muted-foreground">
              {categoryOptionsMap[product?.category]}
            </span>
            <span className="sm:text-[16px] text-xs text-muted-foreground">
              {brandOptionsMap[product?.brand] || ''}
            </span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span
              className={`${product?.salePrice > 0 ? "line-through" : ""
                } sm:text-lg text-base font-semibold text-primary`}
            >
              ₹{product?.price}
            </span>
            {product?.salePrice > 0 ? (
              <span className="sm:text-lg text-base font-semibold text-primary">
                ₹{product?.salePrice}
              </span>
            ) : null}
          </div>
        </CardContent>
      </div>
      <CardFooter className="sm:p-6 p-3">
        {product?.totalStock === 0 ? (
          <Button className="w-full opacity-60 cursor-not-allowed">
            Out Of Stock
          </Button>
        ) : (
          <Button
            onClick={() => addToCart(product?._id, product?.totalStock)}
            className="w-full sm:text-base text-xs"
          >
            Add to cart
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

export default ShoppingProductTile;