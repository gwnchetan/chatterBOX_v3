import { postsService } from './posts.service';

export const cloudinaryService = {
    uploadMedia: async (file) => {
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

            // 3. Direct Upload to Cloudinary
            const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'Upload failed');
            }

            const data = await response.json();

            // 4. Return standardized format
            return {
                url: data.secure_url,
                publicId: data.public_id,
                type: data.resource_type // 'image' or 'video'
            };

        } catch (error) {
            console.error('Cloudinary upload error:', error);
            throw error;
        }
    }
};
