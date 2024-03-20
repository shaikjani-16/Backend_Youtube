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
    fs.unlinkSync(localFilePath);
    return res;
  } catch (error) {
    //remove the file from the server
    fs.unlinkSync(localFilePath);
    return null;
  }
};
const deleteOnCloudinary = async (public_id) => {
  if (!public_id) return null;
  try {
    return await cloudinary.uploader.destroy(public_id);
  } catch (error) {
    console.log(error);
    return null;
  }
};

export default uploadFileCloudinary;
export { deleteOnCloudinary };
