/**
 * Cloudinary URL Builder for Video
 * Implements the v3 "Normalized Intent" pipeline.
 */

// TODO: Move this to an environment variable or config context if possible
// For now, we assume standard Cloudinary URL structure
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

if (!CLOUD_NAME) {
    console.warn("Cloudinary Cloud Name is missing! Videos will fail to load. Please set VITE_CLOUDINARY_CLOUD_NAME.");
}

/**
 * Constructs the final streaming URL from normalized metadata.
 * @param {Object} video - The video object from our DB/State
 * @param {string} video.publicId - The raw Cloudinary Public ID
 * @param {Object} video.crop - Normalized crop { x, y, w, h } (0-1)
 * @param {Object} video.trim - Trim { start, end } (seconds)
 * @param {number} video.rotate - Rotation angle (0, 90, 180, 270)
 * @param {number} originalWidth - Real video width (required for pixel math)
 * @param {number} originalHeight - Real video height (required for pixel math)
 * @param {string} format - 'mp4', 'jpg' (for thumbnails), 'webm', etc.
 */
export const buildVideoUrl = (video, originalWidth, originalHeight, format = 'mp4') => {
    if (!video || !video.publicId) return '';

    // If no cloud name, return empty to prevent 404 spam (or return raw if absolute?)
    if (!CLOUD_NAME) return '';

    // Defaults
    const trimStart = video.trim?.start || 0;
    const trimEnd = video.trim?.end || null;
    const rotate = video.rotate || 0;
    const crop = video.crop || null;

    // 1. Base URL
    let url = `https://res.cloudinary.com/${CLOUD_NAME}/video/upload`;

    // 2. Transformation Pipeline
    // Order: Trim -> Rotate -> Crop
    const transforms = [];

    // A. optimization (Buffering Fix)
    // q_auto: Intelligent quality/size balance
    // f_auto: Best format (WebM/AV1 for Chrome, MP4 for Safari)
    transforms.push('q_auto', 'f_auto');

    // B. Trim
    if (trimStart > 0 || trimEnd) {
        let trimStr = `so_${trimStart}`;
        if (trimEnd) trimStr += `,eo_${trimEnd}`;
        transforms.push(trimStr);
    }

    // B. Rotate
    if (rotate && rotate !== 0) {
        transforms.push(`a_${rotate}`);
    }

    // C. Crop (Convert Normalized -> Absolute)
    // We strictly need originalWidth/Height for this to work with Cloudinary's c_crop
    // C. Crop (Convert Normalized -> Absolute)
    // We explicitly require dimensions. If missing, we SKIP crop to prevent invalid URL.
    if (crop && originalWidth && originalHeight) {
        // If rotate implies dimension swap, handle it
        const isRotated = rotate === 90 || rotate === 270;
        const effectiveWidth = isRotated ? originalHeight : originalWidth;
        const effectiveHeight = isRotated ? originalWidth : originalHeight;

        const xPx = Math.round(crop.x * effectiveWidth);
        const yPx = Math.round(crop.y * effectiveHeight);
        const wPx = Math.round(crop.w * effectiveWidth);
        const hPx = Math.round(crop.h * effectiveHeight);

        transforms.push(`c_crop,x_${xPx},y_${yPx},w_${wPx},h_${hPx}`);
    } else if (crop) {
        // Warn if crop exists but no dimensions (Legacy Data Safety)
        console.warn("Skipping crop due to missing video dimensions", video);
    }

    // Join transforms
    if (transforms.length > 0) {
        url += `/${transforms.join('/')}`;
    }

    // 3. Final Asset
    url += `/${video.publicId}.${format}`; // Ensure clean joining

    // Remove double dots if format is empty or publicId has extension (rare)
    return url;
};

/**
 * Helper to get the correct aspect ratio for the container
 * @param {Object} video 
 */
export const getVideoAspectRatio = (video) => {
    if (!video.crop) return 1; // Default square? or 16:9?
    return video.crop.w / video.crop.h;
};
