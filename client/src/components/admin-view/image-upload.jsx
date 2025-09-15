import { FileIcon, UploadCloudIcon, XIcon } from "lucide-react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { useEffect, useRef, useState } from "react";
import { Button } from "../ui/button";
import axios from "axios";
import { Skeleton } from "../ui/skeleton";
import api from "@/lib/api";

/**
 * Props (existing):
 *  - imageFile, setImageFile
 *  - imageLoadingState, setImageLoadingState
 *  - uploadedImageUrl, setUploadedImageUrl
 *  - isEditMode, isCustomStyling
 *
 * New optional props for gallery:
 *  - enableGallery?: boolean (default false)
 *  - galleryUrls?: string[]          // controlled list of uploaded gallery URLs
 *  - setGalleryUrls?: (urls) => void // setter for gallery URLs
 *  - galleryUploadingState?: boolean
 *  - setGalleryUploadingState?: (bool) => void
 *  - maxGallery?: number (default 10)
 *
 * Endpoints used:
 *  - POST /api/admin/products/upload-image   (single)   -> field: "my_file"
 *  - POST /api/admin/products/upload-images  (multiple) -> field: "my_files"
 */
function ProductImageUpload({
  // existing props
  imageFile,
  setImageFile,
  imageLoadingState,
  uploadedImageUrl,
  setUploadedImageUrl,
  setImageLoadingState,
  isEditMode,
  isCustomStyling = false,

  // new optional props
  enableGallery = false,
  galleryUrls,
  setGalleryUrls,
  galleryUploadingState,
  setGalleryUploadingState,
  maxGallery = 10,
}) {
  const inputRef = useRef(null);

  // fallbacks in case parent does not control gallery states
  const [localGalleryUrls, setLocalGalleryUrls] = useState([]);
  const [localGalleryUploading, setLocalGalleryUploading] = useState(false);

  const galleryList = galleryUrls ?? localGalleryUrls;
  const setGalleryList = setGalleryUrls ?? setLocalGalleryUrls;
  const galleryUploading =
    galleryUploadingState ?? localGalleryUploading;
  const setGalleryUploading =
    setGalleryUploadingState ?? setLocalGalleryUploading;

  function handleImageFileChange(event) {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) setImageFile(selectedFile);
  }

  function handleDragOver(event) {
    event.preventDefault();
  }

  function handleDrop(event) {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files?.[0];
    if (droppedFile) setImageFile(droppedFile);
  }

  function handleRemoveImage() {
    setImageFile(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  async function uploadImageToCloudinary() {
    setImageLoadingState(true);
    try {
      const data = new FormData();
      data.append("my_file", imageFile);
      const response = await api.post(
        "/admin/products/upload-image",
        data
      );
      if (response?.data?.success) {
        setUploadedImageUrl(response.data.result.url);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setImageLoadingState(false);
    }
  }

  // --- Gallery handlers ---
  async function uploadGalleryToCloudinary(files) {
    if (!files?.length) return;
    setGalleryUploading(true);

    try {
      // enforce maxGallery
      const remaining = Math.max(0, maxGallery - (galleryList?.length || 0));
      const filesToSend = Array.from(files).slice(0, remaining);

      if (filesToSend.length === 0) {
        setGalleryUploading(false);
        return;
      }

      const data = new FormData();
      filesToSend.forEach((f) => data.append("my_files", f));

      const response = await api.post(
        "/admin/products/upload-images",
        data
      );

      if (response?.data?.success && Array.isArray(response.data.urls)) {
        // merge & de-duplicate
        const merged = Array.from(
          new Set([...(galleryList || []), ...response.data.urls])
        ).slice(0, maxGallery);
        setGalleryList(merged);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGalleryUploading(false);
    }
  }

  function handleGalleryChange(e) {
    const files = e.target.files || [];
    uploadGalleryToCloudinary(files);
    // reset input so same file can be selected again
    e.target.value = "";
  }

  function removeGalleryUrl(url) {
    setGalleryList((prev) => (prev || []).filter((u) => u !== url));
  }

  useEffect(() => {
    if (imageFile !== null) uploadImageToCloudinary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageFile]);

  return (
    <div className={`w-full mt-4 ${isCustomStyling ? "" : "max-w-md mx-auto"}`}>
      {/* Main image */}
      <Label className="text-lg font-semibold mb-2 block">Upload Image</Label>
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`${isEditMode ? "opacity-60" : ""} border-2 border-dashed rounded-lg p-4`}
      >
        <Input
          id="image-upload"
          type="file"
          accept="image/*"
          className="hidden"
          ref={inputRef}
          onChange={handleImageFileChange}
          disabled={isEditMode}
        />

        {!imageFile ? (
          <Label
            htmlFor="image-upload"
            className={`${isEditMode ? "cursor-not-allowed" : ""} flex flex-col items-center justify-center h-32 cursor-pointer`}
          >
            <UploadCloudIcon className="w-10 h-10 text-muted-foreground mb-2" />
            <span>Drag & drop or click to upload image</span>
          </Label>
        ) : imageLoadingState ? (
          <Skeleton className="h-10 bg-gray-100" />
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FileIcon className="w-8 text-primary mr-2 h-8" />
            </div>
            <p className="text-sm font-medium truncate max-w-[60%]">
              {imageFile?.name || "Uploaded"}
            </p>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
              onClick={handleRemoveImage}
            >
              <XIcon className="w-4 h-4" />
              <span className="sr-only">Remove File</span>
            </Button>
          </div>
        )}
      </div>

      {/* Optional Gallery */}
      {enableGallery && (
        <div className="mt-6">
          <Label className="text-lg font-semibold mb-2 block">
            Gallery Images <span className="text-xs opacity-70">(max {maxGallery})</span>
          </Label>

          <Input
            type="file"
            multiple
            accept="image/*"
            onChange={handleGalleryChange}
            disabled={galleryUploading || isEditMode}
            className="block w-full"
          />

          {galleryUploading ? (
            <div className="mt-3">
              <Skeleton className="h-20 w-full bg-gray-100" />
            </div>
          ) : null}

          {galleryList?.length ? (
            <div className="flex flex-wrap gap-3 mt-3">
              {galleryList.map((url) => (
                <div
                  key={url}
                  className="relative w-20 h-20 border rounded overflow-hidden"
                  title={url}
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeGalleryUrl(url)}
                    className="absolute -top-2 -right-2 bg-black/70 text-white rounded-full w-6 h-6 text-xs"
                    aria-label="Remove"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default ProductImageUpload;
