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

    // 2. Video Exclusivity Rule
    const hasVideo = currentMedia.some(m => m.type === 'video');

    // If we already have a video, we can't add anything else
    if (hasVideo) {
        return { valid: false, error: 'Only one video allowed per post (cannot mix with images).' };
    }

    // If we are adding a video, current list must be empty
    if (newItemType === 'video') {
        if (currentMedia.length > 0) {
            return { valid: false, error: 'Videos must be posted individually.' };
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

    // Ensure mixed content rules are respected
    const videos = media.filter(m => m.type === 'video');
    const images = media.filter(m => m.type !== 'video');

    if (videos.length > 0 && images.length > 0) {
        return { valid: false, error: 'Cannot mix videos and images.' };
    }

    if (videos.length > 1) {
        return { valid: false, error: 'Maximum 1 video allowed.' };
    }

    return { valid: true, error: null };
};
