import { asyncHandler } from "../utils/handler.js";
import User from "../models/user.model.js";
import uploadFileCloudinary from "../utils/cloudinary.js";
const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, username, password } = req.body;
  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new Error("Please fill in all fields.");
  }
  const user = User.findOne({
    $or: [{ username }, { email }],
  });
  if (user) {
    throw new Error("Username or email already exists.");
  }
  console.log(req.files?.avatar[0]?.path);
  const avatarLocation = req.files?.avatar[0]?.path;
  const coverImageLocation = req.files?.coverImage[0]?.path;
  if (!avatarLocation) {
    throw new Error("Please upload an avatar.");
  }
  const avatar = await uploadFileCloudinary(avatarLocation);
  const coverImage = await uploadFileCloudinary(coverImageLocation);
  if (!avatar) {
    throw new Error("Please upload");
  }
  const newUser = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage.url || "",
    email: email,
    username: username.toLowerCase(),
    password: password,
  });
  await newUser.save();
  const createduser = await User.findById(newUser._id).select(
    "-password -refreshToken"
  );
  if (!createduser) {
    throw new Error("Something went wrong creating the user");
  }
  res.status(201).json({
    success: true,
    message: "User created successfully",
    user: createduser,
  });
});

export default registerUser;
