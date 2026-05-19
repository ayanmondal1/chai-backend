import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import deleteFromcloudinary from "../util/deleteFromCloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
    const pipeline = [];
    const defaultCriteria = {
        isPublished: true
    }

    //if user searches something
    if (query) {
        defaultCriteria.$or = [
            { title: { $regex: query, $option: "i" } },
            { description: { $regex: query, $option: "i" } }
        ]
    }

    //if user visit a spacific profile
    if (userId) {
        if (!mongoose.isValidObjectId(userId)) {
            throw new ApiError(400, "Invalid User 1")
        }
        defaultCriteria.owner = new mongoose.Types.ObjectId(userid)
        defaultCriteria.isPublished = false
    }

    //push the completed criteria as frist stage
    pipeline.push({
        $match: defaultCriteria
    })

    //if user short by some type of filter
    const sortField = {}

    if (sortBy) {
        sortField[sortBy] = sortType === "asc" ? 1 : -1
    }
    else {
        sortField["createdAt"] = sortType === "asc" ? 1 : -1
    }

    pipeline.push({
        $sort: sortField
    })

    pipeline.push({
        $lookup: {
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "owner",
            pipeline: [{
                $project: {
                    avatar: 1,
                    username: 1
                }
            }]
        }
    },
        {
            $addField: {
                owner: { $first: "$owner" }
            }
        }
    )

    const option = {
        page: parseInt(page),
        limit: parseInt(limit,)
    }

    const paginatedVideos = await Video.aggregatePaginate(Video.aggregate(pipeline), options)

    if (!paginatedVideos) {
        throw new ApiResponse(500, "Could not fetch video, please try again")
    }

    return res.status(200).json(new ApiResponse(200, paginatedVideos, "successfully fetched video"))

})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body
    // TODO: get video, upload to cloudinary, create video
    if (!req.user?._id) {
        throw new ApiError(400, "please login and try again")
    }

    if (
        [title, description].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const videoFileLocalPath = req.files?.videoFile[0]?.path
    const thumbnailFileLocalPath = req.files?.thumbnail[0]?.path

    if (!videoFileLocalPath) {
        throw new apiError(400, "Video File is required.")
    }

    if (!thumbnailFileLocalPath) {
        throw new apiError(400, "Thumbnail is required.")
    }

    const videoFile = await uploadOnCloudinary(videoFileLocalPath)
    const thumbnailFile = await uploadOnCloudinary(thumbnailFileLocalPath)

    if (!videoFile?.url || !thumbnailFile?.url) {
        throw new apiError(500, "Upload to cloudinary failed. Please try again")
    }

    try {
        const uploadVideo = await Video.create({
            videoFile: {
                url: videoFile.url,
                public_id: videoFile.public_id
            },
            thumnail: {
                url: thumbnailFile.url,
                public_id: thumbnailFile.public_id
            },
            owner: req.user?._id,
            title: title.trim(),
            description: description.trim(),
            duration: videoFile.duration,
            views: 0,
            isPublished: true
        })
    
        return res.status(200).json(new ApiResponse(201, uploadVideo, "Successfully uploded video"))
    } catch (error) {
        if(videoFile?.public_id){
            await deleteFromcloudinary(videoFile.public_id,"video")
        }
        if (thumbnailFile?.public_id) {
            await deleteFromcloudinary(thumbnailFile.public_id, "image")
        }
        throw error
    }
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id

    if (req.user?._id) {
        await Video.findOneAndUpdate(videoId, { $inc: { views: 1 } })
    }

    const getvideoWithDetail = await Video.aggregate([
        {
            $match: {
                videoId: videoId?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "comments",
                localField: "_id",
                foreignField: "video",
                as: "comments",
                pipeline: [
                    {
                        $sort: { createdAt: -1 }
                    },
                    {
                        $limit: 10
                    },
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "CommentOwnerDetails",
                            pipeline: [
                                {
                                    $project: {
                                        username: 1,
                                        avater: 1,
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            commentOwnerDetails: { $first: "$commentOwnerDetails" }
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likse"
            }
        },
        {
            $lookup: {
                from: "user",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            avatar: 1,
                            username: 1,
                        }
                    },
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "chennel",
                            as: "subscribers"
                        }
                    },
                    {
                        $addFields: {
                            SubscriberCount: {
                                $size: "$subscribers"
                            },
                            channelsSubscribedToCount: {
                                $size: "$subscribedTo"
                            },
                            isSubscribed: {
                                $cond: {
                                    if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                                    then: true,
                                    else: false
                                }
                            }
                        }
                    },
                    {
                        $project: { username: 1, avatar: 1, subscriberCount: 1, isSubscribed: 1 }
                    }
                ]
            }
        },
         {
        $addFields:{
            totalLikes:{$size:"$likes"},
            isLiked:{
                $cond:{
                    if:{$in:[(req.user?._id),"$likes.likedBy"]},
                    then:true,
                    else:false
            }},
            owner: {$first: "$owner"},
        }
    }
    ])

    if (getvideoWithDetail.length === 0) {
        throw new ApiError(404, "video doesn't exists sorry")
    }

    return res.status(200).json(new ApiResponse(200, getvideoWithDetail, "Successfully fetched video details"))
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail

    const {title, description, thumbnail} = req.body

    const userid = req.user?._id

    if (
        title.trim() === "" || !title && thumbnail.trim() === "" || !thumbnail && !description
    ) {
        throw new ApiError(400, "required atlact one field to update")
    }

    const updateData = {}

    if (title) {
        updateData.title = title.trim()
    }

    if (thumbnail) {
        updateData.thumbnail = thumbnail.trim()
    }

    if (description) {
        updateData.description = description.trim()
    }

    const updateVideo = await User.findByIdAndUpdate(
        {
            _id:videoId,
            owner: userId
        },
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {new: true}
    )

    if (!updateVideo) {
        throw new ApiError(404, "Video not found or you are not authorized to update this video")
    }

    return res.status(200).json(new ApiResponse(200, updateVideo, "Successfully updated video details"))
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
    const userId = req.user?._id

    const video = await Video.findOneAndDelete(
        {
            _id: videoId,
            owner: userId
        }
    )

    if (!video) {
        throw new ApiError(404, "video not found or you are not authorized to delete this video")
    }

    return res.status(200).json(new ApiResponse(200, null, "Successfully deleted video"))
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const userId = req.user?._id

    const toggleStatus = await Video.findOneAndUpdate(
        {
            _id: videoId,
            owner: userId,
        },
        [
            {
                $set: {
                    isPublished: { $not: "$isPublished"}
                }
            }
        ],
        {
            new: true
        }
    )

    if (!video) {
        throw new ApiError(404, "Video not found or you ate not authorized to update this video")
    }

    return res.status(200).json(new ApiResponse(200, toggleStatus, "Successfully toggled published status"))
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}