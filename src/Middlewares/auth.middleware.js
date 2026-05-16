import ApiError from "../util/ApiError.js";
import asyncHandler from "../util/asyncHandler.js";
import jsonwebtoken from "jsonwebtoken";
import { User } from "../Models/user.model.js"

export const verifyJwt = asyncHandler(async (req, _, next) => {
    try {
        // console.log(accessToken);
        
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
    // console.log(token);
    
        if (!token) {
            throw new ApiError(401, "Unauthorized request")
        }
        // console.log(token);
        

        const decodedtoken = jsonwebtoken.verify(token, process.env.ACCESS_TOKEN_SECRET)
    
        const user = await User.findById(decodedtoken?._id).select("-password -refreshToken")
    
        if (!user) {
            throw new ApiError(401, "Invald Access Token")
        }
    
        req.user = user;
        // console.log(req.user);
        
        next()
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token")
    }
    
})