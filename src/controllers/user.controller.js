import { asyncHandler } from "../utils/handler.js";
import User from "../models/user.model.js";
import uploadFileCloudinary, {
  deleteOnCloudinary,
} from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new Error(
      500,
      "Something went wrong while generating referesh and access token"
    );
  }
};
const registerUser = asyncHandler(async (req, res) => {
  console.log(req.body);
  const { fullName, email, username, password } = req.body;

  if (!fullName || !email || !username || !password) {
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
    avatarPublicId: avatar.public_id,
    coverImage: coverImage?.url || "",
    coverImagePublicId: coverImage?.public_id,
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
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json({
      success: true,
      message: "User logged in successfully",
      user: user,
      accessToken,
      refreshToken,
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

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incoming_token = req.cookies.refreshToken || req.body.refreshToken;
  console.log(incoming_token);
  if (!incoming_token) {
    throw new Error("No refresh token available");
  }
  const verifyToken = jwt.verify(incoming_token, process.env.TOKEN_REFRESH);

  const user = await User.findById(verifyToken?._id);
  if (!user) {
    throw new Error("No user found");
  }
  if (incoming_token !== user?.refreshToken) {
    throw new Error("Invalid refresh token -> if condition failed");
  }
  const options = {
    httpOnly: true,
    secure: true,
  };
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json({
      message: "New refresh token generated",
      success: true,
      accessToken: accessToken,
      refreshToken: refreshToken,
    });
});
const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;
  if (newPassword !== confirmPassword) {
    throw new Error("Invalid confirm password");
  }
  const user = await User.findById(req.user._id);
  if (!user) {
    throw new Error("No user found");
  }
  const isMatch = await user.isPasswordCorrect(oldPassword);
  if (!isMatch) {
    throw new Error("Old password is incorrect");
  }
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  res.status(200).json({
    success: true,
    message: "Password changed successfully",
  });
});
const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select(
    "-password -refreshToken"
  );
  res.status(200).json({
    success: true,
    user: user,
  });
});
const changeAccountDetails = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    throw new Error("No user found");
  }
  user.fullName = req.body.fullName || user.fullName;
  user.username = req.body.username || user.username;
  user.email = req.body.email || user.email;
  await user.save({ validateBeforeSave: false });
  res.status(200).json({
    success: true,
    message: "Account details updated successfully",
    user,
  });
});
const changeAvatar = asyncHandler(async (req, res) => {
  // const user = await User.findById(req.user._id);
  // if (!user) {
  //   throw new Error("No user found");
  // }
  console.log(req.file?.path);
  const avatarLocation = req.file?.path;
  if (!avatarLocation) {
    throw new Error("Please upload an avatar.");
  }

  const dbUser = await User.findById(req.user._id);
  if (!dbUser) {
    throw new Error("No user found");
  }
  const previousAvatar = dbUser.avatarPublicId;
  if (previousAvatar) {
    await deleteOnCloudinary(previousAvatar);
  }
  const avatar = await uploadFileCloudinary(avatarLocation);

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

  if (!avatar.url) {
    throw new Error(400, "Error while uploading on avatar file in cloudinary");
  }

  user.avatarPublicId = avatar.public_id;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: "Avatar updated successfully",
    user,
  });
});
const changeCover = asyncHandler(async (req, res) => {
  // const user = await User.findById(req.user._id);
  // if (!user) {
  //   throw new Error("No user found");
  // }

  const coverLocation = req.file?.path;
  if (!coverLocation) {
    throw new Error("Please upload an avatar.");
  }

  const dbUser = await User.findById(req.user._id);
  if (!dbUser) {
    throw new Error("No user found");
  }
  const previousCover = dbUser.coverImagePublicId;
  if (previousCover) {
    await deleteOnCloudinary(previousCover);
  }
  const cover = await uploadFileCloudinary(coverLocation);
  if (!cover.url) {
    throw new Error(400, "Error while uploading on avatar file in cloudinary");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: cover.url,
      },
    },
    { new: true }
  ).select("-password");

  user.coverImagePublicId = cover.public_id;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: "Cover updated successfully",
    user,
  });
});
const getProfileData = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username.trim()) throw new Error("No username provided");
  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribed",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelSubscribedCount: {
          $size: "$subscribed",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelSubscribedCount: 1,
        isSubscribed: 1,
        avatar: 1,
        email: 1,
        coverImage: 1,
      },
    },
  ]);
  if (!channel?.length) {
    throw new Error(404, "channel not found");
  }
  return res.status(200).json(channel[0]);
});
const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
                {
                  $addFields: {
                    owner: {
                      $first: "$owner",
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ]);
  return res.status(200).json(user[0].watchHistory);
});
export default registerUser;
export {
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  changeAccountDetails,
  changeAvatar,
  changeCover,
  getProfileData,
  getWatchHistory,
};
