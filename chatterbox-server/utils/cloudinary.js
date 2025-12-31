const cloudinary = require('cloudinary').v2;
require('dotenv').config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Asynchronously deletes a media asset from Cloudinary.
 * This function utilizes a fire-and-forget approach for the caller,
 * effectively logging errors but not throwing them to avoid interrupting
 * the main thread (idempotent cleanup).
 * 
 * @param {string} publicId - The public ID of the asset to delete.
 */
const deleteMedia = async (publicId, resourceType = 'image') => {
    try {
        if (!publicId) return;
        console.log(`[Cloudinary] Deleting asset: ${publicId} (${resourceType})`);
        const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
        if (result.result !== 'ok') {
            console.error(`[Cloudinary] Delete failed for ${publicId}:`, result);
        } else {
            console.log(`[Cloudinary] Deleted successfully: ${publicId}`);
        }
    } catch (error) {
        console.error(`[Cloudinary] Exception during delete for ${publicId}:`, error);
    }
};

/**
 * Generates a signature for secure frontend uploads.
 * This allows the frontend to upload directly to Cloudinary without
 * exposing the API secret.
 * 
 * @param {object} paramsToSign - Parameters to sign (timestamp, etc.).
 * @returns {string} - The generated signature.
 */
const generateSignature = (paramsToSign) => {
    return cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET);
};

module.exports = {
    deleteMedia,
    generateSignature,
    cloudinary
};
