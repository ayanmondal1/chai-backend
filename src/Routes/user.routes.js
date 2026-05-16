import { Router } from "express";
import { registerUser, loginUser, logoutUser, refreshAccessToken } from "../Controllers/user.controller.js";
import { upload } from "../Middlewares/multer.middleware.js"
import { verifyJwt } from "../Middlewares/auth.middleware.js";

const router = Router()

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1,
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser)

router.route("/login").post(loginUser)


//secure route
router.route("/logout").post(verifyJwt,logoutUser)
router.route("/refresh-token").post(refreshAccessToken)

export default router