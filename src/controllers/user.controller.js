import { asyncHandler } from "../utils/handler.js";
import User from "../models/user.model.js";
import uploadFileCloudinary from "../utils/cloudinary.js";
const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const generatedToken = user.generateToken();
    const generatedRefreshToken = user.generateRefreshToken();
    user.refreshToken = generatedRefreshToken;
    await user.save({ validateBeforeSave: true });
    return {
      access_token: generatedToken,
      refresh_token: generatedRefreshToken,
    };
  } catch (error) {
    throw new Error(
      "error generating access token in generateAccessAndRefreshToken method"
    );
  }
};
const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, username, password } = req.body;
  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new Error("Please fill in all fields.");
  }
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new Error(409, "User with email or username already exists");
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
    coverImage: coverImage?.url || "",
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
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email && !password) {
    throw new Error("Please fill in all fields.");
  }
  const user = await User.findOne({ email: email });
  if (!user) {
    throw new Error("user does not exists");
  }
  const isMatch = await user.isPasswordCorrect(password);
  if (!isMatch) {
    throw new Error("password is incorrect");
  }
  const { access_token, refresh_token } = await generateAccessAndRefreshToken(
    user._id
  );
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", access_token, options)
    .cookie("refreshToken", refresh_token, options)
    .json({
      success: true,
      message: "User logged in successfully",
      user: user,
      access_token,
      refresh_token,
    });
});
const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1, // this removes the field from document
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json({
      message: "User logged out successfully",
    });
});

export default registerUser;
export { loginUser, logoutUser };
