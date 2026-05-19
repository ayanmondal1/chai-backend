import { v2 as cloudinary } from 'cloudinary';
import fs from "fs"

// Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_CLOUD_KEY,
    api_secret: process.env.CLOUDINARY_CLOUD_SECRET // Click 'View API Keys' above to copy your API secret
});

const deleteFromcloudinary = async (public_id) => {
    try {
        if (!public_id) {
            console.error(400,  "Public ID not provided for deletion of file.")
            return null
        }

        const responce = await cloudinary.uploader.destroy(public_id, {invalidate: false})
        return responce

    } catch (error) {
        console.error("Error deleting file from cloudinary", error)
        return nulll;
    }
}

export default deleteFromcloudinary