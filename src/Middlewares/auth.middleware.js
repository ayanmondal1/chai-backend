import ApiError from "../util/ApiError.js";
import asyncHandler from "../util/asyncHandler.js";
import jsonwebtoken from "jsonwebtoken";
import { User } from "../Models/user.model.js"

export const verifyJwt = asyncHandler(async (req, res, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
    
        if (!token) {
            throw new ApiError(401, "Unauthorized request")
        }
    
        const decodedtoken = jsonwebtoken.verify(token, process.env.ACCESS_TOKEN_SECRET)
    
        const user = await User.findById(decodedtoken?._id).select("-password -refreshToken")
    
        if (!user) {
            throw new ApiError(401, "Invald Access Token")
        }
    
        req.user = user;
        next()
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token")
    }
    
})