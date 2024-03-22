import { Router } from "express";
import registerUser, {
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  changeAccountDetails,
  changeAvatar,
  changeCover,
} from "../../controllers/user.controller.js";
import { upload } from "../../middlewares/multer.js";
import { verifyJWT } from "../../middlewares/auth.middleware.js";
const router = Router();
router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/login").post(loginUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").post(verifyJWT, changeCurrentPassword);
router.route("/get-user").post(verifyJWT, getCurrentUser);
router.route("/change-details").post(verifyJWT, changeAccountDetails);
router
  .route("/change-avatar")
  .patch(verifyJWT, upload.single("avatar"), changeAvatar);
router
  .route("/change-cover")
  .patch(verifyJWT, upload.single("cover"), changeCover);
export default router;
