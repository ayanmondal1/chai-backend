import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videSchema = new Schema({
    videoFile: {
        url: {
            type: String,  //cloudinary
            required: true,
        },
        publid_id: {
            type: String,
            required: true,
        }
    },
    thumnail: {
        url: {
            type: String,  //cloudinary
            required: true,
        },
        publid_id: {
            type: String,
            required: true,
        }
    },
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    duration: {
        type: Number, //cloudinary
        required: true,
    },
    views: {
        type: Number,
        default: 0,
    },
    isPublished: {
        type: Boolean,
        default: true,
    },
    owner: {
        type : Schema.Types.ObjectId,
        ref: "User"
    }
},
    { timestamps: true })

videSchema.plugin(mongooseAggregatePaginate)

export const Video = mongoose.model("Video", videSchema)