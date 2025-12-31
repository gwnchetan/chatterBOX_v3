# Architecture Plan: Safe & Performance-First Video Upload System (Final v3)

## 1. Core Philosophy: "Normalized Intent"
**Golden Rule**: Frontend NEVER stores or calculates pixel values. It stores **User Intent** (0–1 percentages).

**Why?**
*   **Resolution Independent**: Works on 4K, 720p, or Mobile streams equally.
*   **Device Independent**: No dependency on the user's screen pixel density.
*   **Future Proof**: "Crop the center 50%" is always valid, even if we swap the underlying video file for a higher quality version.

---

## 2. Metadata Schema (The Single Source of Truth)
We store **Logic**, not coordinates.

```javascript
video: {
  provider: "cloudinary",
  publicId: "raw_video_id_v1", // The raw, untouched upload

  // The intent instructions
  pipeline: ["trim", "rotate", "layout"], 

  aspectRatio: "9:16", // Target aspect ratio (for UI containers)

  trim: {
    start: 2.5,  // seconds
    end: 15.0    // seconds
  },

  rotate: 90,    // degrees (0, 90, 180, 270)

  crop: {
    x: 0.28,   // 28% from left
    y: 0.18,   // 18% from top
    w: 0.44,   // 44% width
    h: 0.56    // 56% height
  }
}
```

---

## 3. The "Lightweight" Editor (Client-Side)
The editor is purely a **Visualization Tool**. It does not process media.

*   **View**: CSS Transforms (`scale`, `rotate`, `translate`).
*   **Logic**:
    *   User drags a box? Update `crop.x` (percentage).
    *   User rotates? Update `rotate` (integer).
    *   User trims? Update `trim.start` (seconds).
*   **Output**: A tiny JSON object. No Blobs, no Canvas, no FFmpeg.

---

## 4. The URL Builder (Centralized Logic)
All "Pixel Math" happens in **one function**, likely a shared utility. This converts our Normalized Intent into Cloudinary's specific API requirements.

```javascript
/**
 * Constructs the final streaming URL from normalized metadata.
 * @param {Object} video - The metadata object
 * @param {Number} originalWidth - Real video width (from Cloudinary response usually)
 * @param {Number} originalHeight - Real video height
 */
export const buildVideoUrl = (video, originalWidth, originalHeight) => {
  // 1. Convert Normalized -> Absolute Pixels
  // Note: Only needed if Cloudinary doesn't support % for specific transforms, 
  // or if we want absolute control.
  const cropPx = {
    x: Math.round(video.crop.x * originalWidth),
    y: Math.round(video.crop.y * originalHeight),
    w: Math.round(video.crop.w * originalWidth),
    h: Math.round(video.crop.h * originalHeight),
  };

  // 2. Build URL Segment
  // Order matters: Trim -> Rotate -> Crop
  return `https://res.cloudinary.com/${CLOUD_NAME}/video/upload` +
         `/so_${video.trim.start},eo_${video.trim.end}` + // Trim first
         `/a_${video.rotate}` +                            // Then Rotate
         `/c_crop,x_${cropPx.x},y_${cropPx.y},w_${cropPx.w},h_${cropPx.h}` + // Then Crop
         `/${video.publicId}.mp4`;
};
```

---

## 5. Thumbnail Generation (Zero-Effort)
We do **not** use `<canvas>` or client-side captures. We leverage Cloudinary's format conversion.

*   **Video URL**: `.../transformations.../my_video.mp4`
*   **Poster URL**: `.../transformations.../my_video.jpg`

Since the URL parameters are identical, Cloudinary guarantees the image corresponds **exactly** to the first frame of the trimmed/edited video. Sync is perfect.

---

## 6. Feed Performance Rules (Mandatory)
Rendering many videos kills performance. We enforce strict rules:

1.  **Single Active Player**: Only **one** video plays at a time (the one most visible in viewport).
2.  **Metadata Preloading**: `<video preload="metadata">` ensures we load just enough to know size/duration, not the full buffer.
3.  **Auto-Pause**: Use `IntersectionObserver`. If a video leaves the viewport (scrolled past), it **must** pause immediately.
4.  **Muted Autoplay**: Autoplay only works if muted. Unmute requires user interaction.

## 7. Implementation Checklist

### Phase 1: Upload & Data
- [ ] Update `Post` Schema in DB to support new `video` metadata structure.
- [ ] Create `cloudinary.utils.js` on frontend for `buildVideoUrl`.

### Phase 2: Editor Component
- [ ] Build **Visual Crop Overlay** (returns percentages).
- [ ] Build **Trim Slider** (returns seconds).
- [ ] **NO** `ffpmeg.wasm`. **NO** `canvas.toDataURL()`.

### Phase 3: Feed & Playback
- [ ] Implement `VideoPlayer` component.
- [ ] Add `IntersectionObserver` hook for auto-play/pause management.
