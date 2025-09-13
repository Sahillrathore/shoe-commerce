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
import { Fragment, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

const initialFormData = {
  image: null,
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
};

function AdminProducts() {
  const [openCreateProductsDialog, setOpenCreateProductsDialog] =
    useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [imageFile, setImageFile] = useState(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState("");
  const [imageLoadingState, setImageLoadingState] = useState(false);
  const [currentEditedId, setCurrentEditedId] = useState(null);

  const [galleryFiles, setGalleryFiles] = useState([]);     // FileList/Array
  const [galleryUrls, setGalleryUrls] = useState([]);       // Cloudinary URLs
  const [galleryUploading, setGalleryUploading] = useState(false);

  const { productList } = useSelector((state) => state.adminProducts);
  const dispatch = useDispatch();
  const { toast } = useToast();

  function onSubmit(event) {
    event.preventDefault();

    currentEditedId !== null
      ? dispatch(
        editProduct({
          id: currentEditedId,
          formData,
        })
      ).then((data) => {
        console.log(data, "edit");

        if (data?.payload?.success) {
          dispatch(fetchAllProducts());
          setFormData(initialFormData);
          setOpenCreateProductsDialog(false);
          setCurrentEditedId(null);
        }
      })
      : dispatch(
        addNewProduct({
          ...formData,
          image: uploadedImageUrl,
        })
      ).then((data) => {
        if (data?.payload?.success) {
          dispatch(fetchAllProducts());
          setOpenCreateProductsDialog(false);
          setImageFile(null);
          setFormData(initialFormData);
          toast({
            title: "Product add successfully",
          });
        }
      });
  }

  function handleDelete(getCurrentProductId) {
    dispatch(deleteProduct(getCurrentProductId)).then((data) => {
      if (data?.payload?.success) {
        dispatch(fetchAllProducts());
      }
    });
  }

  function isFormValid() {
    return Object.keys(formData)
      .filter((currentKey) => currentKey !== "averageReview")
      .map((key) => formData[key] !== "")
      .every((item) => item);
  }

  useEffect(() => {
    dispatch(fetchAllProducts());
  }, [dispatch]);

  async function uploadGalleryToCloudinary(files) {
    setGalleryUploading(true);
    const data = new FormData();
    // append multiple files with field name "my_files"
    [...files].forEach(f => data.append("my_files", f));
    const response = await axios.post(
      "http://localhost:5000/api/admin/products/upload-images",
      data
    );
    if (response?.data?.success) {
      setGalleryUrls(prev => [...prev, ...(response.data.urls || [])]);
    }
    setGalleryUploading(false);
  }

  function handleGalleryChange(e) {
    const files = e.target.files || [];
    setGalleryFiles(files);
    if (files.length) uploadGalleryToCloudinary(files);
  }

  function removeGalleryUrl(u) {
    setGalleryUrls(prev => prev.filter(x => x !== u));
  }

  function onSubmit(event) {
    event.preventDefault();

    const payload = {
      ...formData,
      image: uploadedImageUrl,     // main image
      images: galleryUrls,         // ✅ gallery
    };

    currentEditedId !== null
      ? dispatch(editProduct({ id: currentEditedId, formData: payload }))
        .then((data) => {
          if (data?.payload?.success) {
            dispatch(fetchAllProducts());
            setFormData(initialFormData);
            setOpenCreateProductsDialog(false);
            setCurrentEditedId(null);
            setGalleryFiles([]);
            setGalleryUrls([]);
          }
        })
      : dispatch(addNewProduct(payload))
        .then((data) => {
          if (data?.payload?.success) {
            dispatch(fetchAllProducts());
            setOpenCreateProductsDialog(false);
            setImageFile(null);
            setFormData(initialFormData);
            setGalleryFiles([]);
            setGalleryUrls([]);
            toast({ title: "Product added successfully" });
          }
        });
  }

  function isFormValid() {
    return Object.keys(formData)
      .filter((k) => !["averageReview", "images"].includes(k)) // ignore avg + gallery for required
      .map((key) => formData[key] !== "")
      .every(Boolean) && !!uploadedImageUrl; // require main image
  }

  return (
    <Fragment>
      <div className="mb-5 w-full flex justify-end">
        <Button onClick={() => setOpenCreateProductsDialog(true)}>
          Add New Product
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        {productList && productList.length > 0
          ? productList.map((productItem, i) => (
            <AdminProductTile
              key={i}
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
            uploadedImageUrl={uploadedImageUrl}
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
