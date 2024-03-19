import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_KEY_SECRET,
});

const uploadFileCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return;
    const res = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    console.log("file uploaded successfully", res.url);
    return res;
  } catch (error) {
    //remove the file from the server
    fs.unlinkSync(localFilePath);
    return null;
  }
};

export default uploadFileCloudinary;
