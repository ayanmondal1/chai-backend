import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { create } from "domain"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    //TODO: toggle like on video
    const userId = req.user?._id;

    if (isValidObjectId(videoId) === false) {
        throw new ApiError(400, "Invalid video Id")
    }

    const existingLike = await Like.findOne(
        {
            video: videoId,
            LikeBy: userId
        }
    )

    existingLike ? await Like.findByIdAndDelete(existingLike?._id) : await Like.create({
        video: videoId,
        LikeBy: userId
    })

    return res.status(200).json(new ApiResponse(200, {isliked : existingLike?false:true}, existingLike? "Removed Like" : "Added Like"))
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    //TODO: toggle like on comment
    const userId = req.user?._id;

    if (isValidObjectId(commentId) === false) {
        throw new ApiError(400, "Invalid comment Id")
    }

    const existingCommentLike = await Like.findOne(
        {
            comment: commentId,
            LikeBy: userId
        }
    )

    existingCommentLike ? await Like.findByIdAndDelete(existingCommentLike?._id) : await Like.create({
        video: commentId,
        LikeBy: userId
    })

    return res.status(200).json(new ApiResponse(200, {isliked : existingCommentLike?false:true}, existingCommentLike? "Removed Comment Like" : "Added Comment Like"))

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    //TODO: toggle like on tweet
    const userId = req.user?._id;

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid Tweet Id")
    }

    const existingTweetLike = await Like.findById(
        {
            tweet: tweetId,
            LikeBy: userId
        }
    )

    existingTweetLike? await Like.findByIdAndDelete(existingTweetLike?._id) : await Like.create(
        {
            tweet: tweetId,
            LikeBy: userId
        }
    )

    return res.status(200).json(new ApiResponse(200, {isliked: existingTweetLike? false: true}, existingTweetLike? "Removed Tweet Like": "Added Tweet Like"))
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    const userId = req.user?._id;

    const getAllLikesVideo = await Like.aggregate(
        [
            {
                $match: {
                    likeBy: userId,
                    video: {$exists : true}
                }
            },
            {
                $lookup: {
                    from: "videos",
                    localField: "video",
                    foreignField: "_id",
                    as: "videoDetails",
                    pipeline: [
                        {
                            $lookup: {
                                from: "users",
                                localField: "owner",
                                foreignField: "_id",
                                as: "ownerDetails"
                            }
                        },
                        {
                            $project: {
                                refreshToken: 0,
                                password: 0,
                                createAt: 0,
                                updatedAt: 0,
                            }
                        }
                    ]
                }
            },
            {
                $addFields: {
                    "videoDetails": { $arrayElementAt: ["$videoDetails", 0]}
                }
            }
        ]
    )

    return res.status(200).json(new ApiResponse(200, {likedVideo: getAllLikesVideo}, "Fetched Liked Videos"))

})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}