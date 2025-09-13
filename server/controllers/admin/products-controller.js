const { imageUploadUtil } = require("../../helpers/cloudinary");
const Product = require("../../models/Product");

const handleImageUpload = async (req, res) => {
  try {
    const b64 = Buffer.from(req.file.buffer).toString("base64");
    const url = "data:" + req.file.mimetype + ";base64," + b64;
    const result = await imageUploadUtil(url);

    res.json({
      success: true,
      result,
    });
  } catch (error) {
    console.log(error);
    res.json({
      success: false,
      message: "Error occured",
    });
  }
};

const handleMultiImageUpload = async (req, res) => {
  try {
    const files = req.files || []; // multer memoryStorage for multiple
    if (!files.length) {
      return res.status(400).json({ success: false, message: "No files found" });
    }

    const uploads = await Promise.all(
      files.map(async (f) => {
        const b64 = Buffer.from(f.buffer).toString("base64");
        const dataUrl = "data:" + f.mimetype + ";base64," + b64;
        const result = await imageUploadUtil(dataUrl);
        return result?.url;
      })
    );

    res.json({ success: true, urls: uploads });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error occured" });
  }
};

//add a new product
const addProduct = async (req, res) => {
  try {
    const {
      image,
      images,          // ✅ NEW
      title,
      description,
      category,
      brand,
      price,
      salePrice,
      totalStock,
      averageReview,
      subCategory,
    } = req.body;

    const newlyCreatedProduct = new Product({
      image,
      images: Array.isArray(images) ? images : [],   // ✅
      title,
      description,
      category,
      brand,
      price,
      salePrice,
      totalStock,
      averageReview,
      subCategory,
    });

    await newlyCreatedProduct.save();
    res.status(201).json({ success: true, data: newlyCreatedProduct });
  } catch (e) {
    console.log(e);
    res.status(500).json({ success: false, message: "Error occured" });
  }
};

//fetch all products

const fetchAllProducts = async (req, res) => {
  try {
    const listOfProducts = await Product.find({});
    res.status(200).json({
      success: true,
      data: listOfProducts,
    });
  } catch (e) {
    console.log(e);
    res.status(500).json({
      success: false,
      message: "Error occured",
    });
  }
};

//edit a product
const editProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      image,
      images, // ✅ if provided as array, we replace the gallery
      title,
      description,
      category,
      brand,
      price,
      salePrice,
      totalStock,
      averageReview,
      subCategory,
    } = req.body;

    let findProduct = await Product.findById(id);
    if (!findProduct)
      return res.status(404).json({ success: false, message: "Product not found" });

    findProduct.title = title ?? findProduct.title;
    findProduct.description = description ?? findProduct.description;
    findProduct.category = category ?? findProduct.category;
    findProduct.brand = brand ?? findProduct.brand;
    findProduct.price = (price === "") ? 0 : (price ?? findProduct.price);
    findProduct.salePrice = (salePrice === "") ? 0 : (salePrice ?? findProduct.salePrice);
    findProduct.totalStock = totalStock ?? findProduct.totalStock;
    findProduct.image = image ?? findProduct.image;
    findProduct.averageReview = averageReview ?? findProduct.averageReview;
    findProduct.subCategory = subCategory ?? findProduct.subCategory;

    // ✅ Replace full gallery if explicitly provided
    if (Array.isArray(images)) {
      findProduct.images = images;
    }

    await findProduct.save();
    res.status(200).json({ success: true, data: findProduct });
  } catch (e) {
    console.log(e);
    res.status(500).json({ success: false, message: "Error occured" });
  }
};

//delete a product
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByIdAndDelete(id);

    if (!product)
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });

    res.status(200).json({
      success: true,
      message: "Product delete successfully",
    });
  } catch (e) {
    console.log(e);
    res.status(500).json({
      success: false,
      message: "Error occured",
    });
  }
};

const addProductImages = async (req, res) => {
  try {
    const { id } = req.params;
    const { urls } = req.body;
    if (!Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ success: false, message: "No urls provided" });
    }

    const updated = await Product.findByIdAndUpdate(
      id,
      { $addToSet: { images: { $each: urls } } }, // avoid duplicates
      { new: true }
    );

    if (!updated) return res.status(404).json({ success: false, message: "Product not found" });
    res.json({ success: true, data: updated });
  } catch (e) {
    console.log(e);
    res.status(500).json({ success: false, message: "Error occured" });
  }
};

/**
 * ✅ Optional: Remove images from gallery
 * DELETE /api/admin/products/:id/images   body: { urls: string[] }
 */
const removeProductImages = async (req, res) => {
  try {
    const { id } = req.params;
    const { urls } = req.body;
    if (!Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ success: false, message: "No urls provided" });
    }

    const updated = await Product.findByIdAndUpdate(
      id,
      { $pull: { images: { $in: urls } } },
      { new: true }
    );

    if (!updated) return res.status(404).json({ success: false, message: "Product not found" });
    res.json({ success: true, data: updated });
  } catch (e) {
    console.log(e);
    res.status(500).json({ success: false, message: "Error occured" });
  }
};


module.exports = {
  handleImageUpload,
  addProduct,
  fetchAllProducts,
  editProduct,
  deleteProduct,
  handleMultiImageUpload,
  addProductImages,
  removeProductImages,
};
