import axios from "axios";
import ProductImageUpload from "@/components/admin-view/image-upload";
import AdminProductTile from "@/components/admin-view/product-tile";
import CommonForm from "@/components/common/form";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useToast } from "@/components/ui/use-toast";
import { addProductFormElements } from "@/config";
import {
  addNewProduct,
  deleteProduct,
  editProduct,
  fetchAllProducts,
} from "@/store/admin/products-slice";
import { Fragment, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import api from "@/lib/api";

const initialFormData = {
  image: "",
  images: [],
  title: "",
  description: "",
  category: "",
  brand: "",
  price: "",
  salePrice: "",
  totalStock: "",
  averageReview: 0,
  subCategory: "",
  size: [6,7,8,9],
};

const REQUIRED_FIELDS = [
  "title",
  "description",
  "category",
  "brand",
  "price",
  "salePrice",
  "totalStock",
  "subCategory",
];

function AdminProducts() {
  const [openCreateProductsDialog, setOpenCreateProductsDialog] =
    useState(false);
  const [formData, setFormData] = useState(initialFormData);

  // uploader state
  const [imageFile, setImageFile] = useState(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState("");
  const [imageLoadingState, setImageLoadingState] = useState(false);

  // gallery state
  const [galleryFiles, setGalleryFiles] = useState([]); // FileList/Array
  const [galleryUrls, setGalleryUrls] = useState([]); // Cloudinary URLs
  const [galleryUploading, setGalleryUploading] = useState(false);

  const [currentEditedId, setCurrentEditedId] = useState(null);

  const { productList } = useSelector((state) => state.adminProducts);
  const dispatch = useDispatch();
  const { toast } = useToast();

  // Fetch products
  useEffect(() => {
    dispatch(fetchAllProducts());
  }, [dispatch]);

  // Hydrate edit state from DB product
  useEffect(() => {
    if (currentEditedId) {
      const product = (productList || []).find((p) => p?._id === currentEditedId);
      if (product) {
        setFormData((prev) => ({
          ...prev,
          ...product,
          image: product.image || "",
          images: Array.isArray(product.images) ? product.images : [],
        }));
        setUploadedImageUrl(product.image || "");
        setGalleryUrls(Array.isArray(product.images) ? product.images : []);
        setOpenCreateProductsDialog(true);
      }
    } else {
      // if no edit id, ensure uploader clean slate (for Add flow)
      setUploadedImageUrl("");
      setGalleryUrls([]);
      setImageFile(null);
    }
  }, [currentEditedId, productList]);

  // Upload multiple gallery images
  async function uploadGalleryToCloudinary(files) {
    if (!files?.length) return;
    setGalleryUploading(true);
    try {
      const data = new FormData();
      [...files].forEach((f) => data.append("my_files", f));
      const response = await api.post(
        "/admin/products/upload-images",
        data
      );
      if (response?.data?.success) {
        setGalleryUrls((prev) => [...prev, ...(response.data.urls || [])]);
      }
    } finally {
      setGalleryUploading(false);
    }
  }

  function handleGalleryChange(e) {
    const files = e.target.files || [];
    setGalleryFiles(files);
    if (files.length) uploadGalleryToCloudinary(files);
  }

  function removeGalleryUrl(u) {
    setGalleryUrls((prev) => prev.filter((x) => x !== u));
  }

  // Validation: all required fields + image rules
  function isFormValid() {
    const baseValid = REQUIRED_FIELDS.every(
      (k) => String(formData[k] ?? "").trim() !== ""
    );
    const hasMainImage =
      currentEditedId !== null
        ? Boolean(uploadedImageUrl || formData.image)
        : Boolean(uploadedImageUrl);
    return baseValid && hasMainImage;
  }

  function buildPayload() {
    const mainImage = uploadedImageUrl || formData.image || "";
    const imagesPayload = Array.isArray(galleryUrls) ? galleryUrls : [];

    return {
      ...formData,
      image: mainImage,
      images: imagesPayload,
    };
  }

  function onSubmit(event) {
    event.preventDefault();

    const payload = buildPayload();

    if (currentEditedId !== null) {
      dispatch(editProduct({ id: currentEditedId, formData: payload })).then(
        (data) => {
          if (data?.payload?.success) {
            dispatch(fetchAllProducts());
            setFormData(initialFormData);
            setOpenCreateProductsDialog(false);
            setCurrentEditedId(null);
            setGalleryFiles([]);
            setGalleryUrls([]);
            setUploadedImageUrl("");
            setImageFile(null);
            toast({ title: "Product updated successfully" });
          }
        }
      );
    } else {
      dispatch(addNewProduct(payload)).then((data) => {
        if (data?.payload?.success) {
          dispatch(fetchAllProducts());
          setOpenCreateProductsDialog(false);
          setImageFile(null);
          setFormData(initialFormData);
          setGalleryFiles([]);
          setGalleryUrls([]);
          setUploadedImageUrl("");
          toast({ title: "Product added successfully" });
        }
      });
    }
  }

  function handleDelete(getCurrentProductId) {
    dispatch(deleteProduct(getCurrentProductId)).then((data) => {
      if (data?.payload?.success) {
        dispatch(fetchAllProducts());
      }
    });
  }

  return (
    <Fragment>
      <div className="mb-5 w-full flex justify-end">
        <Button
          onClick={() => {
            setCurrentEditedId(null);
            setFormData(initialFormData);
            setUploadedImageUrl("");
            setGalleryUrls([]);
            setImageFile(null);
            setOpenCreateProductsDialog(true);
          }}
        >
          Add New Product
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        {productList && productList.length > 0
          ? productList.map((productItem) => (
              <AdminProductTile
                key={productItem?._id}
                setFormData={setFormData}
                setOpenCreateProductsDialog={setOpenCreateProductsDialog}
                setCurrentEditedId={setCurrentEditedId}
                product={productItem}
                handleDelete={handleDelete}
              />
            ))
          : null}
      </div>

      <Sheet
        open={openCreateProductsDialog}
        onOpenChange={() => {
          setOpenCreateProductsDialog(false);
          setCurrentEditedId(null);
          setFormData(initialFormData);
          setUploadedImageUrl("");
          setGalleryUrls([]);
          setImageFile(null);
        }}
      >
        <SheetContent side="right" className="overflow-auto">
          <SheetHeader>
            <SheetTitle>
              {currentEditedId !== null ? "Edit Product" : "Add New Product"}
            </SheetTitle>
          </SheetHeader>

          <ProductImageUpload
            imageFile={imageFile}
            setImageFile={setImageFile}
            uploadedImageUrl={uploadedImageUrl} // hydrated on edit
            setUploadedImageUrl={setUploadedImageUrl}
            imageLoadingState={imageLoadingState}
            setImageLoadingState={setImageLoadingState}
            isEditMode={currentEditedId !== null}
            enableGallery
            galleryUrls={galleryUrls}
            setGalleryUrls={setGalleryUrls}
            galleryUploadingState={galleryUploading}
            setGalleryUploadingState={setGalleryUploading}
            maxGallery={10}
          />

          {/* Optional: inline gallery manager (remove/preview) */}
          {galleryUrls?.length ? (
            <div className="px-1 mt-3">
              <label className="text-sm font-medium">Gallery</label>
              <div className="flex flex-wrap gap-3 mt-2">
                {galleryUrls.map((url) => (
                  <div
                    key={url}
                    className="relative w-20 h-20 border rounded overflow-hidden"
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeGalleryUrl(url)}
                      className="absolute -top-2 -right-2 bg-black/70 text-white rounded-full w-6 h-6 text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="py-6">
            <CommonForm
              onSubmit={onSubmit}
              formData={formData}
              setFormData={setFormData}
              buttonText={currentEditedId !== null ? "Edit" : "Add"}
              formControls={addProductFormElements}
              isBtnDisabled={!isFormValid()}
            />
          </div>
        </SheetContent>
      </Sheet>
    </Fragment>
  );
}

export default AdminProducts;
