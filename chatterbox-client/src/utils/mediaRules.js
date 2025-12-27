/**
 * Centralized Media Validation Rules for Post Creation
 * 
 * Rules:
 * 1. Max 5 total items.
 * 2. Max 1 video (Exclusive: No images/GIFs if video present).
 * 3. Mixed Giphy + Images allowed (<= 5).
 * 4. Video cannot be mixed with any other media.
 */

export const MAX_MEDIA_COUNT = 5;

/**
 * Validates if a new item can be added to the current media list.
 * @param {Array} currentMedia - Array of current media objects { type: 'image' | 'video' | 'gif' }
 * @param {string} newItemType - 'image', 'video', or 'gif'
 * @returns {object} { valid: boolean, error: string | null }
 */
export const validateMediaAddition = (currentMedia, newItemType) => {
    // 1. Check total count limit
    if (currentMedia.length >= MAX_MEDIA_COUNT) {
        return { valid: false, error: `Maximum ${MAX_MEDIA_COUNT} media items allowed.` };
    }

    const hasVideo = currentMedia.some(m => m.type === 'video');

    // 2. Video Exclusivity Rule (Current state has video)
    if (hasVideo) {
        return { valid: false, error: 'Video items cannot be mixed with other media.' };
    }

    // 3. Video Exclusivity Rule (New item is video)
    if (newItemType === 'video') {
        if (currentMedia.length > 0) {
            return { valid: false, error: 'Video items cannot be mixed with other media.' };
        }
    }

    return { valid: true, error: null };
};

/**
 * Validates the final post payload before publishing.
 * @param {Array} media - Final array of media objects
 * @returns {object} { valid: boolean, error: string | null }
 */
export const validatePostPayload = (media) => {
    if (media.length > MAX_MEDIA_COUNT) {
        return { valid: false, error: `Maximum ${MAX_MEDIA_COUNT} media items allowed.` };
    }

    const videos = media.filter(m => m.type === 'video');
    if (videos.length > 1) {
        return { valid: false, error: 'Only 1 video allowed per post.' };
    }

    if (videos.length === 1 && media.length > 1) {
        return { valid: false, error: 'Videos cannot be mixed with other media.' };
    }

    return { valid: true, error: null };
};
