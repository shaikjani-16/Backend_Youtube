import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
const userSchema = new Schema(
  {
    username: {
      type: string,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: string,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    fullName: {
      type: string,
      required: true,
      index: true,
      trim: true,
    },
    avatar: {
      type: string,
      required: true,
    },
    coverImage: {
      type: string,
    },
    watchHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    pasword: {
      type: string,
      required: true,
    },
    refreshToken: {
      type: string,
    },
  },
  { timestamps: true }
);
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  this.pasword = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};
userSchema.methods.generateToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      fullName: this.fullname,
    },
    process.env.TOKEN_SECRET,
    { expiresIn: process.env.TOKEN_EXPIRY_TIME }
  );
};
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.TOKEN_REFRESH,
    { expiresIn: process.env.TOKEN_REFRESH_EXPIRY_TIME }
  );
};
export default User = mongoose.model("User", userSchema);
