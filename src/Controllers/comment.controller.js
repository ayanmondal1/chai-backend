import mongoose from "mongoose"
import { Comment } from "../models/comment.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import { getWatchHistory } from "./user.controller.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const { videoId } = req.params
    const { page = 1, limit = 10 } = req.query

    if (!videoId?.trim()) {
        throw new ApiError(400, "videoId is messing")
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    const comments = Comment.aggregate(
        [
            {

                $match: {
                    video: new mongoose.Types.ObjectId(videoId),
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
                                as: "ownerDetails",
                                pipeline: [
                                    {
                                        $project: {
                                            avatar: 1,
                                            username: 1,
                                            avatar: 1
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            $addFields: {
                                ownerDetails: { $first: "$ownerDetails" } //We put this here(I had prev assigned it in the User model nested pipeline) becuase of scope issues. The `owneerDetails` field belongs to the `Video` model not the `User` model , thus it can't be accessible there.
                            }
                        }
                    ]
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "ownerDetails",
                    pipeline: [
                        {
                            $lookup: {
                                from: "videos",
                                localField: "watchHistory",
                                foreignField: "_id",
                                as: "watchHistoryDetails",
                            }
                        },
                        {
                            $addFields: {
                                watchHistoryDetails: { $first: "$watchHistoryDetails" }
                            }
                        }
                    ]
                }
            }
        ]
    )

    const options = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
    }

    const result = await Comment.aggregatePaginate(comments, options)

    if (!result) {
        throw new ApiError(404, "Error while fetching comments")
    }

    return res.status(200, result, "Comments fetched successfully")
})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video

    const { videoId } = req.params;
    const { _id } = req.user;
    const { content } = req.body;

    if (content.trim() == "") {
        throw new ApiError(400, "Comment cannot bd empty");
    }

    if (!(await Video.findById(videoId))) {
        throw new ApiError(404, "Video not found")
    }

    const user = await User.findById(_id)

    if (!user) {
        throw new ApiError(400, "User dosen't exist")
    }

    const comment = await Comment.create(
        {
            content: content,
            video: videoId,
            owner: _id
        }
    )

    if (!comment) {
        throw new ApiError(500, "Error while adding comment")
    }

    return res.status(200).json(new ApiResponse(200, comment, "Comment added Successfully"))

})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const { commentId, videoId } = req.params;
    const { _id } = req.user;
    const { newContent } = req.body;

    if (!commentId) {
        throw new ApiError(404, "Invalid comment Id")
    }

    const Comment = await Comment.findById(commentId)

    if (!Comment) {
        throw new ApiError(404, "Comment dosen't exists")
    }

    const Video_id = await Video.findById(videoId)

    if (!Video_id) {
        throw new ApiError(404, "Video dosen't exists, Sorry")
    }

    //we also need to check if the comment being updated was writtend by the same user
    if (Comment?.owner.toString() !== _id.toString()) {
        throw new ApiError(403, "you are not authorized to update this comment")
    }

    const comment = await Comment.findByIdAndUpdate(commentId,
        {
            content: newContent,
        },
        {
            new: true
        }
    )

    if (!comment) {
        throw new ApiError(500, "Error while updating comment")
    }

    return res.status(200).json(new ApiResponse(200, comment, "Comment updated successfully"))
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const {commentId } = req.params;

    if (!commentId) {
        throw new ApiError(400, "Invalid comment Id")
    }

    const comment = await Comment.findById(commentId)

    if (!comment) {
        throw new ApiError(404, "Comment not found")
    }

    if (comment?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You are not authorized to delete this comment")
    }

    const deleteCommnet = await Comment.findByIdAndDelete(
        {
            _id: commentId,
            owner: req.user?._id
        }
    )

    if (!deleteComment) {
        throw new ApiError(500, "Error while deleting comment, plaese try again")
    }

    return res.status(200).json(new ApiResponse(200, null, "Comment deleted successfully"))
})

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}