import React, { useState, useRef, useEffect, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import VideoTrimSlider from './VideoTrimSlider';
import { Play, Pause, RotateCw } from '../common/Icons';

/**
 * VideoEditor (Phase 2)
 * Purely visual editor generating "Normalized Intent" metadata.
 * 
 * Contracts:
 * 1. Rotation: logic handled, resets visual crop.
 * 2. AspectRatio: explicit string, resets visual crop.
 * 3. Crop: 0-1 normalized, relative to VISIBLE rotated frame.
 * 4. Trim: Seconds.
 */
const VideoEditor = ({ videoSrc, onSave, onCancel }) => {
    // Media State
    const videoRef = useRef(null);
    const [duration, setDuration] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });

    // Editor Intent State (The Source of Truth)
    const [crop, setCrop] = useState({ x: 0, y: 0 }); // react-easy-crop internal use
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
    const [aspectRatio, setAspectRatio] = useState(4 / 5); // Default 4:5
    const [trim, setTrim] = useState({ start: 0, end: 0 });

    // Final Output State
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null); // Used for thumbnail capture only
    const [croppedAreaNormalized, setCroppedAreaNormalized] = useState(null); // The intent to save

    // Sync state with the ACTUAL visible video element rendered by react-easy-crop
    useEffect(() => {
        // We use a polling/observer approach to find the video tag inserted by the library
        const findAndSyncVideo = () => {
            const container = document.querySelector('.cropper-container');
            if (!container) return;
            const visibleVideo = container.querySelector('video');

            if (visibleVideo && visibleVideo !== videoRef.current) {
                // Found the third-party video element!

                // 1. Sync Listeners
                visibleVideo.onloadedmetadata = (e) => {
                    setDuration(e.target.duration);
                    if (trim.end === 0) setTrim({ start: 0, end: e.target.duration });
                };

                visibleVideo.ontimeupdate = () => {
                    // Loop Logic
                    if (visibleVideo.currentTime >= trim.end) {
                        visibleVideo.pause();
                        visibleVideo.currentTime = trim.start;
                        if (isPlaying) visibleVideo.play();
                    }
                };

                // 2. Sync Playback Command
                if (isPlaying) {
                    visibleVideo.play().catch(e => console.log("Autoplay blocked", e));
                } else {
                    visibleVideo.pause();
                }

                // 3. Sync Volume? 
                // We want to hear this one.
                visibleVideo.muted = false;
            }
        };

        const interval = setInterval(findAndSyncVideo, 500);
        findAndSyncVideo(); // Immediate check

        return () => clearInterval(interval);
    }, [isPlaying, trim]);

    // Hidden Video Logic (Purely for Thumbnail Capture now)
    // We mute it so we don't hear double audio
    const onHiddenVideoLoaded = (e) => {
        setNaturalSize({ width: e.target.videoWidth, height: e.target.videoHeight });
        e.target.muted = true;
    };

    // Force Seek when Trim Start Changes (The Missing Link for "First Run" bug)
    useEffect(() => {
        const container = document.querySelector('.cropper-container');
        if (!container) return;
        const visibleVideo = container.querySelector('video');

        if (visibleVideo) {
            // If we are currently BEFORE the new start, OR way past the end, jump.
            // But main UX: If user drags "Start" handle, we want to see that frame.
            if (Math.abs(visibleVideo.currentTime - trim.start) > 0.5) {
                visibleVideo.currentTime = trim.start;
            }
        }
    }, [trim.start]);


    /**
     * ROTATION LOGIC
     * Contract: Changing rotation resets crop intent to center to avoid safe-area bugs.
     */
    const handleRotate = () => {
        setRotation(prev => (prev + 90) % 360);
        // React-easy-crop handles the visual rotation for us if we pass 'rotation' prop
        // We will reset zoom/crop to defaults to be safe as per contract
        setCrop({ x: 0, y: 0 });
        setZoom(1);
    };

    /**
     * ASPECT RATIO LOGIC
     * Contract: Resets crop intent to center.
     */
    const handleAspectChange = (ratio) => {
        setAspectRatio(ratio);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
    };

    /**
     * CROPPING CALLBACK (React Easy Crop)
     */
    const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaNormalized(croppedArea); // The 0-1 intent
        setCroppedAreaPixels(croppedAreaPixels); // Absolute pixels (for thumbnail only)
    }, []);

    /**
     * THUMBNAIL CAPTURE (With Rotation)
     */
    const captureThumbnail = async () => {
        if (!videoRef.current) return null;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const vid = videoRef.current;

        // Let's just draw the raw frame for the list preview.
        // It won't match the crop perfectly but sufficient for "Posting..." state.

        // BETTER: Use the `croppedAreaPixels` to pluck the right region.
        // But `rotate` complicates it.
        // Simplification for Phase 2: Capture FULL frame, resized.

        canvas.width = 300;
        canvas.height = 300 * (naturalSize.height / naturalSize.width);
        ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);

        return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.7));
    };

    /**
     * SAVE HANDLER
     */
    const handleSave = async () => {
        const thumbBlob = await captureThumbnail();

        // 1. Construct Schema strictly matching contracts
        const metadata = {
            // PROVIDER INTENT
            rotate: rotation,
            aspectRatio: aspectRatio === 1 ? '1:1' : aspectRatio === 4 / 5 ? '4:5' : '16:9',
            trim: {
                start: trim.start,
                end: trim.end
            },
            crop: {
                x: croppedAreaNormalized.x / 100, // library gives 0-100, we want 0-1
                y: croppedAreaNormalized.y / 100,
                w: croppedAreaNormalized.width / 100,
                h: croppedAreaNormalized.height / 100
            }
        };

        onSave(metadata, thumbBlob);
    };

    return (
        <div className="video-editor-fullscreen">
            {/* 1. Header */}
            <div className="editor-header">
                <button onClick={onCancel} className="btn-text">Cancel</button>
                <h3>Edit Video</h3>
                <button onClick={handleSave} className="btn-primary">Done</button>
            </div>

            {/* 2. Visual Canvas (Cropper) */}
            <div className="cropper-container">
                <div className="crop-wrapper">
                    <Cropper
                        video={videoSrc} // React-easy-crop supports video url here
                        crop={crop}
                        zoom={zoom}
                        rotation={rotation}
                        aspect={aspectRatio}
                        onCropChange={setCrop}
                        onCropComplete={onCropComplete}
                        onZoomChange={setZoom}
                        // Restrict drag
                        restrictPosition={true}
                    />
                </div>
                {/* Hidden video el for logic/thumbnail */}
                <video
                    ref={videoRef}
                    src={videoSrc}
                    onLoadedMetadata={onHiddenVideoLoaded}
                    style={{ display: 'none' }}
                    crossOrigin="anonymous" // needed if src is external
                />
            </div>

            {/* 3. Controls */}
            <div className="editor-controls">

                {/* Playback Toggle */}
                <div className="control-row center">
                    <button
                        className="btn-circle-lg"
                        onClick={() => {
                            if (isPlaying) videoRef.current.pause();
                            else videoRef.current.play();
                            setIsPlaying(!isPlaying);
                        }}
                    >
                        {isPlaying ? <Pause width={24} /> : <Play width={24} />}
                    </button>
                </div>

                {/* Trim Slider */}
                <div className="control-row">
                    <VideoTrimSlider
                        duration={duration}
                        startTime={trim.start}
                        endTime={trim.end}
                        onChange={(s, e) => setTrim({ start: s, end: e })}
                    />
                </div>

                {/* Transforms */}
                <div className="control-actions">
                    <button className="btn-icon-label" onClick={handleRotate}>
                        <RotateCw />
                        <span>Rotate</span>
                    </button>

                    <div className="aspect-toggles">
                        <button className={aspectRatio === 1 ? 'active' : ''} onClick={() => handleAspectChange(1)}>1:1</button>
                        <button className={aspectRatio === 4 / 5 ? 'active' : ''} onClick={() => handleAspectChange(4 / 5)}>4:5</button>
                        <button className={aspectRatio === 16 / 9 ? 'active' : ''} onClick={() => handleAspectChange(16 / 9)}>16:9</button>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .video-editor-fullscreen {
                    position: fixed;
                    inset: 0;
                    z-index: 2000;
                    background: #000;
                    display: flex;
                    flex-direction: column;
                    color: white;
                }
                .editor-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px;
                    background: rgba(0,0,0,0.8);
                    z-index: 10;
                }
                .cropper-container {
                    flex: 1;
                    position: relative;
                    background: #111;
                    overflow: hidden;
                }
                .crop-wrapper {
                    position: absolute;
                    top: 0; left: 0; right: 0; bottom: 0;
                }
                .editor-controls {
                    background: #121212;
                    padding: 20px;
                    padding-bottom: 40px;
                }
                .control-row {
                    margin-bottom: 16px;
                }
                .control-row.center {
                    display: flex;
                    justify-content: center;
                }
                .control-actions {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .aspect-toggles {
                    display: flex;
                    background: #333;
                    border-radius: 8px;
                    overflow: hidden;
                }
                .aspect-toggles button {
                    background: transparent;
                    border: none;
                    color: #aaa;
                    padding: 8px 12px;
                    font-size: 12px;
                    cursor: pointer;
                }
                .aspect-toggles button.active {
                    background: #39a0ff;
                    color: white;
                }
                .btn-text {
                    background: none; border: none; color: white; font-size: 1rem; cursor: pointer;
                }
                .btn-primary {
                    background: #39a0ff; border: none; padding: 6px 16px; border-radius: 20px; color: white; cursor: pointer;
                }
                .btn-circle-lg {
                    width: 50px; height: 50px; border-radius: 50%; background: white; color: black;
                    border: none; display: flex; alignItems: center; justifyContent: center; cursor: pointer;
                }
                .btn-icon-label {
                    background: none; border: none; color: white; display: flex; flex-direction: column; 
                    align-items: center; gap: 4px; font-size: 10px; cursor: pointer;
                }
            `}</style>
        </div>
    );
};

export default VideoEditor;
