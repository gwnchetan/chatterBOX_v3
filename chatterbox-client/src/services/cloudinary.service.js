import axios from 'axios';
import { postsService } from './posts.service';

export const cloudinaryService = {
    uploadMedia: async (file, onProgress) => {
        try {
            // 1. Get signature from backend
            const { signature, timestamp, apiKey, cloudName } = await postsService.getUploadSignature();

            // 2. Prepare FormData
            const formData = new FormData();
            formData.append('file', file);
            formData.append('api_key', apiKey);
            formData.append('timestamp', timestamp);
            formData.append('signature', signature);
            // Optional: Folder organization
            // formData.append('folder', 'chatterbox_posts');

            // 3. Upload to Cloudinary with Progress
            const response = await axios.post(
                `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
                formData,
                {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    onUploadProgress: (progressEvent) => {
                        if (onProgress && progressEvent.total) {
                            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                            onProgress(percentCompleted);
                        }
                    }
                }
            );

            const data = response.data;

            // 4. Return standardized format
            return {
                url: data.secure_url,
                publicId: data.public_id,
                type: data.resource_type, // 'image' or 'video'
                width: data.width,
                height: data.height
            };

        } catch (error) {
            console.error('Cloudinary upload error:', error);
            // Axios errors have response.data
            const errMsg = error.response?.data?.error?.message || error.message || 'Upload failed';
            throw new Error(errMsg);
        }
    }
};
